import { useState, useMemo, useRef } from "react";
import { FORMATS } from "./lib/formats";
import type { AdFormat, SubFormat, FunnelStage } from "./lib/types";

type Panel = "library" | "studio" | "generate";

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  top: { bg: "#1e3d2f", text: "#3ddc84", border: "rgba(61,220,132,.3)" },
  mid: { bg: "#3b3010", text: "#f4c542", border: "rgba(244,197,66,.3)" },
  btm: { bg: "#0e2c3d", text: "#5bc8f5", border: "rgba(91,200,245,.3)" },
};

// Pipeline agent states
interface AgentState {
  name: string;
  label: string;
  model: string;
  status: "pending" | "running" | "done" | "error";
  result?: unknown;
  error?: string;
}

const AGENT_ORDER = ["strategist", "copywriter", "director", "qa"];
const AGENT_LABELS: Record<string, string> = {
  strategist: "Strategist",
  copywriter: "Copywriter",
  director: "Director",
  qa: "QA Review",
};
const AGENT_ICONS: Record<string, string> = {
  strategist: "🧠",
  copywriter: "✍️",
  director: "🎬",
  qa: "✅",
};

export default function App() {
  const [panel, setPanel] = useState<Panel>("library");
  const [selected, setSelected] = useState<AdFormat | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");

  // Studio
  const [brief, setBrief] = useState({ brand: "", product: "", description: "", audience: "", objective: "", funnelStage: "mid", platforms: ["tiktok", "instagram"], tone: "" });
  const [suggestions, setSuggestions] = useState<AdFormat[] | null>(null);

  // Generate (pipeline)
  const [generating, setGenerating] = useState(false);
  const [agents, setAgents] = useState<AgentState[]>(
    AGENT_ORDER.map(name => ({ name, label: AGENT_LABELS[name], model: "", status: "pending" as const }))
  );
  const [pipelineResult, setPipelineResult] = useState<unknown>(null);
  const [pipelineError, setPipelineError] = useState("");

  const filtered = useMemo(() => {
    let list = FORMATS;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q) ||
        f.subs.some(s => s.name.toLowerCase().includes(q))
      );
    }
    if (filterTier !== "all") list = list.filter(f => f.funil.includes(filterTier as FunnelStage));
    return list;
  }, [search, filterTier]);

  const handleSuggest = () => {
    const keywords = (brief.brand + " " + brief.product + " " + brief.audience).toLowerCase();
    const scored = FORMATS.map(f => ({
      format: f,
      score: f.subs.filter(s => (s.name + " " + (s.quando || "") + " " + (s.dica || "")).toLowerCase().split(" ").some(w => keywords.includes(w))).length
        + (f.desc.toLowerCase().split(" ").some(w => keywords.includes(w)) ? 2 : 0)
    })).sort((a, b) => b.score - a.score).slice(0, 5);
    setSuggestions(scored.map(s => s.format));
  };

  const startGenerate = (f: AdFormat, s: SubFormat) => {
    setPanel("generate");
    runPipeline(f, s);
  };

  const runPipeline = async (format: AdFormat, sub: SubFormat) => {
    setGenerating(true);
    setPipelineResult(null);
    setPipelineError("");
    setAgents(AGENT_ORDER.map(name => ({ name, label: AGENT_LABELS[name], model: "", status: "pending" as const })));

    const fullBrief = {
      brand: brief.brand || "Brand",
      product: brief.product || format.name,
      description: brief.description || format.desc,
      audience: brief.audience || "general audience",
      objective: brief.objective || "drive conversions",
      funnelStage: brief.funnelStage || "mid",
      platforms: brief.platforms.length ? brief.platforms : ["tiktok", "instagram"],
      tone: brief.tone || "",
      formats: [format.name],
    };

    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullBrief),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setPipelineError(err.error || `Request failed (${res.status})`);
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setGenerating(false); return; }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // keep incomplete line

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7).trim();
            // next data line
            continue;
          }
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              handleSSEEvent(data);
            } catch {}
          }
        }
      }
    } catch (e: any) {
      setPipelineError(e.message || "Connection failed");
    }
    setGenerating(false);
  };

  const handleSSEEvent = (data: any) => {
    // Check if it has agent field — it's an agent event
    if (data.agent && data.label) {
      if (data.result !== undefined) {
        // agent_complete
        setAgents(prev => prev.map(a =>
          a.name === data.agent ? { ...a, status: "done" as const, result: data.result } : a
        ));
      } else if (data.error) {
        // agent_error
        setAgents(prev => prev.map(a =>
          a.name === data.agent ? { ...a, status: "error" as const, error: data.error } : a
        ));
      } else if (data.model) {
        // agent_start
        setAgents(prev => prev.map(a =>
          a.name === data.agent ? { ...a, status: "running" as const, model: data.model } : a
        ));
      }
    }
    // complete event — the full package
    if (data.generatedAt || data.strategy || data.scripts) {
      setPipelineResult(data);
    }
  };

  const allSubs = FORMATS.reduce((a, f) => a + f.subs.length, 0);

  return (
    <div className="h-dvh flex flex-col overflow-hidden" style={{ background: "#080808", color: "#f0f0f0" }}>
      {/* HEADER */}
      <header className="flex items-center gap-3 px-4 flex-shrink-0 z-10" style={{ height: 52, background: "rgba(8,8,8,.98)", backdropFilter: "blur(20px)", borderBottom: "1px solid #1d1d1d" }}>
        <button onClick={() => setPanel("library")} className="flex items-center gap-2 text-base no-underline flex-shrink-0" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, letterSpacing: 4, color: "#e63946" }}>
          AD.<span style={{ color: "#f0f0f0" }}>LIB</span>
        </button>
        <span className="w-px h-4 flex-shrink-0" style={{ background: "#282828" }} />
        <nav className="flex gap-1">
          {(["library", "studio", "generate"] as Panel[]).map(p => (
            <button key={p} onClick={() => setPanel(p)}
              className="text-[9px] tracking-wider uppercase px-2.5 py-1 rounded cursor-pointer whitespace-nowrap"
              style={{
                fontFamily: "'DM Mono',monospace", letterSpacing: "1.2px",
                border: panel === p ? "1px solid #e63946" : "1px solid transparent",
                color: panel === p ? "#e63946" : "#555",
                background: panel === p ? "rgba(230,57,70,.06)" : "transparent"
              }}>
              {p === "library" ? "Library" : p === "studio" ? "Studio" : "Generate"}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px]" style={{ fontFamily: "'DM Mono',monospace", color: "#555" }}>
            {FORMATS.length} formats · {allSubs}+ variations
          </span>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 flex overflow-hidden">
        {panel === "library" && (
          <LibraryView
            formats={filtered} selected={selected} onSelect={setSelected}
            expandedId={expandedId} onToggle={setExpandedId}
            search={search} onSearch={setSearch}
            filterTier={filterTier} onFilterTier={setFilterTier}
            onGenerate={startGenerate}
          />
        )}
        {panel === "studio" && (
          <StudioView
            brief={brief} onChange={(k, v) => setBrief(b => ({ ...b, [k]: v }))}
            suggestions={suggestions} onSuggest={handleSuggest}
            onSelect={(f) => { setPanel("generate"); }}
          />
        )}
        {panel === "generate" && (
          <GenerateView
            generating={generating} agents={agents} result={pipelineResult} error={pipelineError}
            brief={brief}
          />
        )}
      </main>
    </div>
  );
}

/* ───────────────────── LIBRARY ───────────────────── */

function LibraryView({ formats, selected, onSelect, expandedId, onToggle, search, onSearch, filterTier, onFilterTier, onGenerate }: {
  formats: AdFormat[]; selected: AdFormat | null; onSelect: (f: AdFormat | null) => void;
  expandedId: number | null; onToggle: (n: number | null) => void;
  search: string; onSearch: (s: string) => void;
  filterTier: string; onFilterTier: (s: string) => void;
  onGenerate: (f: AdFormat, s: SubFormat) => void;
}) {
  return (
    <>
      <aside className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: 220, borderRight: "1px solid #1d1d1d", background: "#0e0e0e" }}>
        <div className="p-2.5 border-b" style={{ borderColor: "#1d1d1d" }}>
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search…"
            className="w-full text-xs rounded outline-none px-2.5 py-1.5"
            style={{ background: "#131313", border: "1px solid #1d1d1d", color: "#f0f0f0", fontFamily: "'DM Sans',sans-serif" }} />
          <div className="flex gap-1 mt-2">
            {["all", "top", "mid", "btm"].map(t => (
              <button key={t} onClick={() => onFilterTier(t)}
                className="text-[8px] tracking-wider uppercase px-2 py-0.5 rounded cursor-pointer whitespace-nowrap"
                style={{
                  fontFamily: "'DM Mono',monospace",
                  border: filterTier === t ? "1px solid #e63946" : "1px solid #1d1d1d",
                  color: filterTier === t ? "#e63946" : "#555",
                  background: filterTier === t ? "rgba(230,57,70,.06)" : "transparent"
                }}>
                {t === "all" ? "All" : t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {formats.map(f => (
            <div key={f.id} onClick={() => onSelect(selected?.id === f.id ? null : f)}
              className="flex items-center gap-2.5 px-3.5 py-2 cursor-pointer transition-colors duration-100"
              style={{
                borderLeft: `2px solid ${selected?.id === f.id ? f.color : "transparent"}`,
                background: selected?.id === f.id ? "rgba(255,255,255,.04)" : "transparent"
              }}>
              <span className="text-sm flex-shrink-0" style={{ width: 18, textAlign: "center" }}>{f.icon}</span>
              <span className="text-xs flex-1 leading-none" style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "1.5px", color: selected?.id === f.id ? "#f0f0f0" : "#999" }}>
                {f.name}
              </span>
              <span className="text-[8px] px-1 py-0.5 rounded" style={{ fontFamily: "'DM Mono',monospace", color: "#555", background: "#181818", border: "1px solid #1d1d1d" }}>
                {f.subs.length}
              </span>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="p-8 pb-16">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ border: "1px solid #282828" }}>
                {selected.icon}
              </div>
              <div className="flex-1">
                <div className="text-[9px] tracking-widest uppercase mb-1" style={{ fontFamily: "'DM Mono',monospace", color: selected.color }}>
                  Format #{selected.id.toString().padStart(2, "0")}
                </div>
                <h1 className="text-3xl font-bold leading-none" style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "2px" }}>
                  {selected.name}
                </h1>
                <p className="text-sm mt-2" style={{ color: "#999" }}>{selected.desc}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selected.tipos.map(t => (
                    <span key={t} className="text-[8px] tracking-wider uppercase px-2 py-0.5 rounded" style={{ fontFamily: "'DM Mono',monospace", color: t === "video" ? "#5bc8f5" : "#c084fc", border: t === "video" ? "1px solid rgba(91,200,245,.25)" : "1px solid rgba(192,132,252,.25)", background: t === "video" ? "rgba(91,200,245,.07)" : "rgba(192,132,252,.07)" }}>
                      {t.toUpperCase()}
                    </span>
                  ))}
                  {selected.funil.map(t => (
                    <span key={t} className="text-[8px] tracking-wider uppercase px-2 py-0.5 rounded" style={{ fontFamily: "'DM Mono',monospace", color: tierColors[t].text, border: `1px solid ${tierColors[t].border}`, background: tierColors[t].bg }}>
                      {t === "top" ? "TOF" : t === "mid" ? "MOF" : "BOF"}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <span className="text-[9px] tracking-widest uppercase block mb-4" style={{ fontFamily: "'DM Mono',monospace", color: "#555" }}>
                Sub-formats
              </span>
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))" }}>
                {selected.subs.map((s, i) => (
                  <div key={i} className="rounded-xl overflow-hidden flex flex-col" style={{ background: "#131313", border: "1px solid #1d1d1d" }}>
                    <div style={{ height: 2, background: selected.color }} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="text-[8px] tracking-wider uppercase mb-1" style={{ fontFamily: "'DM Mono',monospace", color: "#555" }}>Sub-Format</div>
                          <h3 className="text-sm font-semibold">{s.name}</h3>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <span className="text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded" style={{ fontFamily: "'DM Mono',monospace", color: s.tipo === "video" ? "#5bc8f5" : "#c084fc", border: s.tipo === "video" ? "1px solid rgba(91,200,245,.25)" : "1px solid rgba(192,132,252,.25)" }}>
                            {s.tipo?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#999", lineHeight: 1.6 }}>{s.quando}</p>
                      <p className="text-xs mt-2" style={{ color: "#666", lineHeight: 1.6, fontFamily: "'DM Mono',monospace", fontSize: 10 }}>
                        <span style={{ color: "#e63946" }}>Structure:</span> {s.estrutura}
                      </p>
                      <p className="text-xs mt-2 italic" style={{ color: "#666" }}>
                        <span style={{ color: "#f4c542" }}>Hook:</span> {s.hook}
                      </p>
                      <p className="text-xs mt-2" style={{ color: "#c084fc" }}>
                        <span style={{ fontWeight: 600 }}>💡</span> {s.dica}
                      </p>
                      <button onClick={() => onGenerate(selected, s)}
                        className="mt-3 w-full text-[9px] tracking-wider uppercase py-2 rounded cursor-pointer transition-colors"
                        style={{ fontFamily: "'DM Mono',monospace", background: selected.color, color: "#fff", border: "none", letterSpacing: "1px" }}>
                        Generate Creative →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-12 text-center">
            <div>
              <div className="text-5xl mb-5 opacity-60">🎬</div>
              <h1 className="text-4xl font-bold leading-none mb-2.5" style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "2px" }}>
                AD.<em style={{ color: "#e63946", fontStyle: "normal" }}>LIB</em> Creative Library
              </h1>
              <p className="text-sm max-w-md mx-auto mb-8" style={{ color: "#999", lineHeight: 1.7 }}>
                A complete taxonomy of ad formats for paid social. Pick any format to see structure, hooks, and generate creatives with the 4-agent pipeline.
              </p>
              <div className="flex gap-px mb-12">
                {[{ n: FORMATS.length, l: "Formats" }, { n: allSubs(FORMATS), l: "Sub-formats" }].map(s => (
                  <div key={s.l} className="px-6 py-3 text-center" style={{ background: "#131313", border: "1px solid #1d1d1d" }}>
                    <div className="text-2xl font-bold" style={{ fontFamily: "'Bebas Neue',sans-serif", color: "#e63946" }}>{s.n}</div>
                    <div className="text-[8px] tracking-wider uppercase mt-1" style={{ fontFamily: "'DM Mono',monospace", color: "#555" }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function allSubs(formats: AdFormat[]) { return formats.reduce((a, f) => a + f.subs.length, 0); }

/* ───────────────────── STUDIO ───────────────────── */

function StudioView({ brief, onChange, suggestions, onSuggest, onSelect }: {
  brief: { brand: string; product: string; description: string; audience: string; objective: string; funnelStage: string; platforms: string[]; tone: string };
  onChange: (k: string, v: any) => void;
  suggestions: AdFormat[] | null;
  onSuggest: () => void;
  onSelect: (f: AdFormat) => void;
}) {
  const platforms = ["tiktok", "instagram", "facebook", "youtube", "linkedin", "twitter"];
  const funnelStages = [
    { v: "top", l: "Awareness", c: "#3ddc84" },
    { v: "mid", l: "Consideration", c: "#f4c542" },
    { v: "btm", l: "Conversion", c: "#5bc8f5" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-16">
      <h1 className="text-3xl font-bold leading-none mb-1" style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "2px" }}>
        Creative <span style={{ color: "#e63946" }}>Studio</span>
      </h1>
      <p className="text-sm mb-8" style={{ color: "#999" }}>Fill in your brief — the 4-agent pipeline will generate complete ad packages.</p>

      <div className="max-w-2xl grid gap-4 mb-6">
        {[
          { k: "brand", l: "Brand", ph: "Nike" },
          { k: "product", l: "Product / Offer", ph: "Air Max 2026" },
          { k: "description", l: "Product Description", ph: "Lightweight running shoe with React foam..." },
          { k: "audience", l: "Target Audience", ph: "Runners 18-35, urban, active lifestyle" },
          { k: "objective", l: "Campaign Objective", ph: "Drive signups for limited drop" },
          { k: "tone", l: "Tone (optional)", ph: "Bold, energetic, aspirational" },
        ].map(f => (
          <div key={f.k}>
            <label className="text-[9px] tracking-widest uppercase block mb-1.5" style={{ fontFamily: "'DM Mono',monospace", color: "#555" }}>{f.l}</label>
            <input value={(brief as any)[f.k]} onChange={e => onChange(f.k, e.target.value)} placeholder={f.ph}
              className="w-full text-sm px-3 py-2 rounded outline-none"
              style={{ background: "#131313", border: "1px solid #1d1d1d", color: "#f0f0f0" }} />
          </div>
        ))}

        <div>
          <label className="text-[9px] tracking-widest uppercase block mb-1.5" style={{ fontFamily: "'DM Mono',monospace", color: "#555" }}>Funnel Stage</label>
          <div className="flex gap-2">
            {funnelStages.map(f => (
              <button key={f.v} onClick={() => onChange("funnelStage", f.v)}
                className="flex-1 text-xs py-2 rounded cursor-pointer"
                style={{
                  background: brief.funnelStage === f.v ? f.c + "15" : "#131313",
                  border: `1px solid ${brief.funnelStage === f.v ? f.c : "#1d1d1d"}`,
                  color: brief.funnelStage === f.v ? f.c : "#555",
                  fontFamily: "'DM Mono',monospace",
                }}>
                {f.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[9px] tracking-widest uppercase block mb-1.5" style={{ fontFamily: "'DM Mono',monospace", color: "#555" }}>Platforms</label>
          <div className="flex flex-wrap gap-1.5">
            {platforms.map(p => (
              <button key={p} onClick={() => {
                const has = brief.platforms.includes(p);
                onChange("platforms", has ? brief.platforms.filter(x => x !== p) : [...brief.platforms, p]);
              }}
                className="text-[9px] tracking-wider uppercase px-3 py-1.5 rounded cursor-pointer whitespace-nowrap"
                style={{
                  fontFamily: "'DM Mono',monospace", letterSpacing: "1px",
                  background: brief.platforms.includes(p) ? "#e63946" : "#131313",
                  border: `1px solid ${brief.platforms.includes(p) ? "#e63946" : "#1d1d1d"}`,
                  color: brief.platforms.includes(p) ? "#fff" : "#555"
                }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <button onClick={onSuggest}
          className="text-[9px] tracking-wider uppercase py-3 rounded cursor-pointer border-none"
          style={{ fontFamily: "'DM Mono',monospace", letterSpacing: "1px", background: "#e63946", color: "#fff" }}>
          Suggest Formats →
        </button>
      </div>

      {suggestions && (
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "1.5px" }}>Recommended Formats</h2>
          <div className="grid gap-2">
            {suggestions.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors"
                style={{ background: "#131313", border: "1px solid #1d1d1d" }}
                onClick={() => onSelect(f)}>
                <span className="text-lg">{f.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{f.name}</div>
                  <div className="text-xs" style={{ color: "#999" }}>{f.desc.slice(0, 100)}…</div>
                </div>
                <span className="text-[8px]" style={{ fontFamily: "'DM Mono',monospace", color: "#555" }}>{f.subs.length} subs</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── GENERATE (PIPELINE) ───────────────────── */

function GenerateView({ generating, agents, result, error, brief }: {
  generating: boolean; agents: AgentState[]; result: unknown; error: string;
  brief: any;
}) {
  const resultRef = useRef<HTMLDivElement>(null);

  // Copy result as JSON
  const copyJSON = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    }
  };

  // Extract scripts from result for display
  const pkg = result as any;
  const hasResult = !!pkg?.generatedAt;

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-16" ref={resultRef}>
      <h1 className="text-2xl font-bold leading-none mb-1" style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "2px" }}>
        Agent <span style={{ color: "#e63946" }}>Pipeline</span>
      </h1>
      <p className="text-sm mb-6" style={{ color: "#999" }}>
        4 agents × OpenCode Zen (free models) → complete creative package
      </p>

      {/* Agent Progress */}
      <div className="grid gap-2 mb-8" style={{ maxWidth: 600 }}>
        {agents.map((a, i) => (
          <div key={a.name} className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{
              background: a.status === "running" ? "rgba(230,57,70,.06)" : a.status === "done" ? "rgba(61,220,132,.04)" : a.status === "error" ? "rgba(230,57,70,.04)" : "#131313",
              border: `1px solid ${a.status === "running" ? "#e63946" : a.status === "done" ? "#3ddc84" : a.status === "error" ? "#e63946" : "#1d1d1d"}`,
            }}>
            <span className="text-lg">{AGENT_ICONS[a.name]}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "1px" }}>{a.label}</span>
                {a.model && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ fontFamily: "'DM Mono',monospace", color: "#999", background: "#181818", border: "1px solid #282828" }}>
                    {a.model}
                  </span>
                )}
              </div>
              {a.error && <div className="text-[10px] mt-0.5" style={{ color: "#e63946" }}>{a.error}</div>}
            </div>
            <div className="flex-shrink-0">
              {a.status === "pending" && <span className="text-[9px]" style={{ fontFamily: "'DM Mono',monospace", color: "#555" }}>waiting</span>}
              {a.status === "running" && (
                <span className="text-[9px] flex items-center gap-1" style={{ fontFamily: "'DM Mono',monospace", color: "#e63946" }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#e63946] animate-pulse" /> running
                </span>
              )}
              {a.status === "done" && <span className="text-[9px]" style={{ fontFamily: "'DM Mono',monospace", color: "#3ddc84" }}>✓ done</span>}
              {a.status === "error" && <span className="text-[9px]" style={{ fontFamily: "'DM Mono',monospace", color: "#e63946" }}>✗ error</span>}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl mb-6 text-sm" style={{ background: "rgba(230,57,70,.08)", border: "1px solid rgba(230,57,70,.3)", color: "#e63946" }}>
          {error}
        </div>
      )}

      {/* Results */}
      {hasResult && (
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-bold" style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "1.5px" }}>
              Creative Package
            </h2>
            <button onClick={copyJSON}
              className="text-[9px] tracking-wider uppercase px-3 py-1.5 rounded cursor-pointer"
              style={{ fontFamily: "'DM Mono',monospace", background: "#131313", border: "1px solid #1d1d1d", color: "#999" }}>
              Copy JSON
            </button>
          </div>

          {/* Strategy */}
          {pkg.strategy && pkg.strategy.analysis && (
            <div className="mb-6 p-4 rounded-xl" style={{ background: "#131313", border: "1px solid #1d1d1d" }}>
              <div className="text-[9px] tracking-widest uppercase mb-2" style={{ fontFamily: "'DM Mono',monospace", color: "#3ddc84" }}>🧠 Strategy</div>
              <p className="text-sm" style={{ color: "#ccc", lineHeight: 1.7 }}>{pkg.strategy.analysis}</p>
              {pkg.strategy.selectedFormats && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {pkg.strategy.selectedFormats.map((f: any, i: number) => (
                    <div key={i} className="px-3 py-2 rounded-lg text-xs" style={{ background: "#181818", border: "1px solid #282828" }}>
                      <span className="font-semibold">{f.formatName}</span>
                      <span style={{ color: "#666" }}> — </span>
                      <span style={{ color: "#999" }}>{f.angle}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scripts */}
          {pkg.scripts && Array.isArray(pkg.scripts) && (
            <div className="mb-6">
              <div className="text-[9px] tracking-widest uppercase mb-3" style={{ fontFamily: "'DM Mono',monospace", color: "#f4c542" }}>✍️ Scripts</div>
              {pkg.scripts.map((s: any, i: number) => (
                <div key={i} className="mb-3 p-4 rounded-xl" style={{ background: "#131313", border: "1px solid #1d1d1d" }}>
                  <div className="text-xs font-semibold mb-2" style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "1px" }}>
                    {s.formatName} — {s.subFormatName}
                  </div>
                  <pre className="text-xs whitespace-pre-wrap" style={{ color: "#ccc", fontFamily: "'DM Mono',monospace", lineHeight: 1.7 }}>
                    {s.script}
                  </pre>
                  {s.hookOptions && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.hookOptions.map((h: string, j: number) => (
                        <span key={j} className="text-[9px] px-2 py-1 rounded" style={{ background: "#181818", border: "1px solid #282828", color: "#999" }}>
                          Hook {j + 1}: {h.slice(0, 60)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Visual Direction */}
          {pkg.visualDirection && Array.isArray(pkg.visualDirection) && (
            <div className="mb-6">
              <div className="text-[9px] tracking-widest uppercase mb-3" style={{ fontFamily: "'DM Mono',monospace", color: "#5bc8f5" }}>🎬 Visual Direction</div>
              {pkg.visualDirection.map((v: any, i: number) => (
                <div key={i} className="mb-3 p-4 rounded-xl" style={{ background: "#131313", border: "1px solid #1d1d1d" }}>
                  <div className="text-xs font-semibold mb-1" style={{ fontFamily: "'Bebas Neue',sans-serif" }}>{v.formatName}</div>
                  <p className="text-xs mb-2" style={{ color: "#999" }}>{v.visualStyle}</p>
                  {v.colorPalette && (
                    <div className="flex gap-1 mb-2">
                      {v.colorPalette.map((c: string, j: number) => (
                        <div key={j} className="w-6 h-6 rounded" style={{ background: c, border: "1px solid #282828" }} title={c} />
                      ))}
                    </div>
                  )}
                  {v.shots && v.shots.length > 0 && (
                    <div className="grid gap-1 mt-2">
                      {v.shots.slice(0, 4).map((shot: any, j: number) => (
                        <div key={j} className="text-[10px] px-2 py-1 rounded" style={{ background: "#181818", fontFamily: "'DM Mono',monospace" }}>
                          <span style={{ color: "#5bc8f5" }}>{shot.time}</span>
                          <span style={{ color: "#666" }}> — </span>
                          <span style={{ color: "#ccc" }}>{shot.description?.slice(0, 80)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* QA Review */}
          {pkg.qaReview && (
            <div className="p-4 rounded-xl" style={{
              background: pkg.qaReview.verdict === "SHIP" ? "rgba(61,220,132,.04)" : "rgba(244,197,66,.04)",
              border: `1px solid ${pkg.qaReview.verdict === "SHIP" ? "rgba(61,220,132,.3)" : "rgba(244,197,66,.3)"}`,
            }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] tracking-widest uppercase" style={{ fontFamily: "'DM Mono',monospace", color: "#555" }}>QA Review</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{
                  fontFamily: "'Bebas Neue',sans-serif",
                  background: pkg.qaReview.verdict === "SHIP" ? "rgba(61,220,132,.15)" : "rgba(244,197,66,.15)",
                  color: pkg.qaReview.verdict === "SHIP" ? "#3ddc84" : "#f4c542",
                }}>
                  {pkg.qaReview.verdict} {pkg.qaReview.overallScore}/100
                </span>
              </div>
              {pkg.qaReview.strengths && (
                <div className="text-xs mb-1" style={{ color: "#3ddc84" }}>
                  {pkg.qaReview.strengths.map((s: string) => `✓ ${s}`).join(" · ")}
                </div>
              )}
              {pkg.qaReview.issues && (
                <div className="text-xs" style={{ color: "#f4c542" }}>
                  {pkg.qaReview.issues.map((s: string) => `⚠ ${s}`).join("\n")}
                </div>
              )}
              {pkg.qaReview.finalNotes && (
                <p className="text-xs mt-2" style={{ color: "#999" }}>{pkg.qaReview.finalNotes}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!generating && !hasResult && !error && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4 opacity-40">⚡</div>
          <p className="text-sm" style={{ color: "#555" }}>
            Open the Library → pick a format → click "Generate Creative"<br />
            The pipeline runs Strategist → Copywriter → Director → QA automatically.
          </p>
        </div>
      )}
    </div>
  );
}
