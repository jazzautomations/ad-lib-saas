import { useState, useMemo } from "react";
import { FORMATS } from "./lib/formats";
import type { AdFormat, SubFormat, FunnelStage } from "./lib/types";

type Panel = "library" | "studio" | "generate";

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  top: { bg: "#1e3d2f", text: "#3ddc84", border: "rgba(61,220,132,.3)" },
  mid: { bg: "#3b3010", text: "#f4c542", border: "rgba(244,197,66,.3)" },
  btm: { bg: "#0e2c3d", text: "#5bc8f5", border: "rgba(91,200,245,.3)" },
};

const tierNames: Record<string, string> = {
  top: "Top of Funnel",
  mid: "Middle of Funnel",
  btm: "Bottom of Funnel",
};

export default function App() {
  const [panel, setPanel] = useState<Panel>("library");
  const [selected, setSelected] = useState<AdFormat | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");

  // Studio
  const [brief, setBrief] = useState({ brand: "", product: "", audience: "", platform: "tiktok" });
  const [suggestions, setSuggestions] = useState<AdFormat[] | null>(null);

  // Generate
  const [genFormat, setGenFormat] = useState<AdFormat | null>(null);
  const [genSub, setGenSub] = useState<SubFormat | null>(null);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");

  const filtered = useMemo(() => {
    let list = FORMATS;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.desc.toLowerCase().includes(q) ||
        f.subs.some(s => s.name.toLowerCase().includes(q))
      );
    }
    if (filterTier !== "all") {
      list = list.filter(f => f.funil.includes(filterTier as FunnelStage));
    }
    return list;
  }, [search, filterTier]);

  const handleSuggest = async () => {
    if (!brief.brand && !brief.product) return;
    // Score formats based on brief keywords
    const keywords = (brief.brand + " " + brief.product + " " + brief.audience + " " + brief.platform).toLowerCase();
    const scored = FORMATS.map(f => ({
      format: f,
      score: f.subs.filter(s =>
        (s.name + " " + (s.quando || "") + " " + (s.dica || "")).toLowerCase().split(" ").some((w: string) => keywords.includes(w))
      ).length + (f.desc.toLowerCase().split(" ").some((w: string) => keywords.includes(w)) ? 2 : 0)
    })).sort((a, b) => b.score - a.score).slice(0, 5);
    setSuggestions(scored.map(s => s.format));
  };

  const startGenerate = (f: AdFormat, s: SubFormat) => {
    setGenFormat(f);
    setGenSub(s);
    setPanel("generate");
    setOutput("");
  };

  const handleGenerate = async () => {
    if (!genSub || !genFormat) return;
    setGenerating(true);
    setOutput("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formatName: genFormat.name,
          formatDesc: genFormat.desc,
          subName: genSub.name,
          quando: genSub.quando,
          hook: genSub.hook,
          estrutura: genSub.estrutura,
          dica: genSub.dica,
          brief: {
            brand: brief.brand || "Brand",
            product: brief.product || genFormat.name,
            audience: brief.audience || "general",
            platform: brief.platform || "tiktok",
            objective: "conversions",
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setOutput(err.error || "Request failed");
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  text += parsed.content;
                  setOutput(text);
                }
              } catch {}
            }
          }
        }
      }

      if (!text) setOutput("No content generated");
    } catch (e: any) {
      setOutput("Error: " + e.message);
    }
    setGenerating(false);
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
            onSelect={(f) => { setGenFormat(f); setPanel("library"); }}
          />
        )}
        {panel === "generate" && (
          <GenerateView
            format={genFormat} sub={genSub}
            generating={generating} output={output}
            onGenerate={handleGenerate}
          />
        )}
      </main>
    </div>
  );
}

/* ───────────────────── COMPONENTS ───────────────────── */

function LibraryView({ formats, selected, onSelect, expandedId, onToggle, search, onSearch, filterTier, onFilterTier, onGenerate }: {
  formats: AdFormat[]; selected: AdFormat | null; onSelect: (f: AdFormat | null) => void;
  expandedId: number | null; onToggle: (n: number | null) => void;
  search: string; onSearch: (s: string) => void;
  filterTier: string; onFilterTier: (s: string) => void;
  onGenerate: (f: AdFormat, s: SubFormat) => void;
}) {
  return (
    <>
      {/* Sidebar */}
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

      {/* Detail panel */}
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
                <p className="text-sm mt-2" style={{ color: "#999" }}>
                  {selected.desc}
                </p>
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
                Sub-formats — click to expand
              </span>
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))" }}>
                {selected.subs.map((s, i) => (
                  <div key={i} className="rounded-xl overflow-hidden flex flex-col" style={{ background: "#131313", border: "1px solid #1d1d1d" }}>
                    <div style={{ height: 2, background: selected.color }} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="text-[8px] tracking-wider uppercase mb-1" style={{ fontFamily: "'DM Mono',monospace", color: "#555" }}>
                            Sub-Format
                          </div>
                          <h3 className="text-sm font-semibold">{s.name}</h3>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <span className="text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded" style={{ fontFamily: "'DM Mono',monospace", color: s.tipo === "video" ? "#5bc8f5" : "#c084fc", border: s.tipo === "video" ? "1px solid rgba(91,200,245,.25)" : "1px solid rgba(192,132,252,.25)" }}>
                            {s.tipo?.toUpperCase()}
                          </span>
                          {s.funil && (
                            <span className="text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded"
                              style={{ fontFamily: "'DM Mono',monospace",
                                color: tierColors[Array.isArray(s.funil) ? s.funil[0] : s.funil]?.text || "#555",
                                border: `1px solid ${tierColors[Array.isArray(s.funil) ? s.funil[0] : s.funil]?.border || "#282828"}`,
                                background: tierColors[Array.isArray(s.funil) ? s.funil[0] : s.funil]?.bg || "transparent" }}>
                              {Array.isArray(s.funil) ? s.funil[0].toUpperCase() : s.funil.toUpperCase()}
                            </span>
                          )}
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
                A complete taxonomy of ad formats and sub-formats for paid social.
                Pick any format to see structure, hooks, and production notes.
              </p>
              <div className="flex gap-px mb-12">
                {[
                  { n: FORMATS.length, l: "Formats" },
                  { n: FORMATS.reduce((a, f) => a + f.subs.length, 0), l: "Sub-formats" },
                ].map(s => (
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

function StudioView({ brief, onChange, suggestions, onSuggest, onSelect }: {
  brief: { brand: string; product: string; audience: string; platform: string };
  onChange: (k: string, v: string) => void;
  suggestions: AdFormat[] | null;
  onSuggest: () => void;
  onSelect: (f: AdFormat) => void;
}) {
  const platforms = ["tiktok", "instagram", "facebook", "youtube", "linkedin", "twitter"];

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-16">
      <h1 className="text-3xl font-bold leading-none mb-1" style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "2px" }}>
        Creative <span style={{ color: "#e63946" }}>Studio</span>
      </h1>
      <p className="text-sm mb-8" style={{ color: "#999" }}>Tell us about your campaign and we'll suggest the best formats.</p>

      <div className="max-w-2xl grid gap-4 mb-8">
        {[
          { k: "brand", l: "Brand", ph: "e.g. Nike" },
          { k: "product", l: "Product / Offer", ph: "e.g. Air Max 2026" },
          { k: "audience", l: "Target Audience", ph: "e.g. Athletes 18-35" },
        ].map(f => (
          <div key={f.k}>
            <label className="text-[9px] tracking-widest uppercase block mb-1.5" style={{ fontFamily: "'DM Mono',monospace", color: "#555" }}>{f.l}</label>
            <input value={(brief as any)[f.k]} onChange={e => onChange(f.k, e.target.value)} placeholder={f.ph}
              className="w-full text-sm px-3 py-2 rounded outline-none"
              style={{ background: "#131313", border: "1px solid #1d1d1d", color: "#f0f0f0" }} />
          </div>
        ))}
        <div>
          <label className="text-[9px] tracking-widest uppercase block mb-1.5" style={{ fontFamily: "'DM Mono',monospace", color: "#555" }}>Platform</label>
          <div className="flex flex-wrap gap-1.5">
            {platforms.map(p => (
              <button key={p} onClick={() => onChange("platform", p)}
                className="text-[9px] tracking-wider uppercase px-3 py-1.5 rounded cursor-pointer whitespace-nowrap"
                style={{
                  fontFamily: "'DM Mono',monospace", letterSpacing: "1px",
                  background: brief.platform === p ? "#e63946" : "#131313",
                  border: `1px solid ${brief.platform === p ? "#e63946" : "#1d1d1d"}`,
                  color: brief.platform === p ? "#fff" : "#555"
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
          <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "1.5px" }}>
            Recommended Formats
          </h2>
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

function GenerateView({ format, sub, generating, output, onGenerate }: {
  format: AdFormat | null; sub: SubFormat | null;
  generating: boolean; output: string;
  onGenerate: () => void;
}) {
  if (!format || !sub) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-center">
        <div>
          <div className="text-5xl mb-5 opacity-60">🎬</div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "2px" }}>
            Select a <span style={{ color: "#e63946" }}>Format</span>
          </h2>
          <p className="text-sm mt-2" style={{ color: "#999" }}>
            Browse the Library and click "Generate Creative →" on any sub-format.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-16">
      <div className="flex items-center gap-4 mb-6">
        <span className="text-3xl">{format.icon}</span>
        <div>
          <h1 className="text-2xl font-bold leading-none" style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "2px" }}>
            Generate <span style={{ color: format.color }}>{format.name}</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "#999" }}>{sub.name}</p>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-xl" style={{ background: "#131313", border: "1px solid #1d1d1d" }}>
        <div className="grid gap-3 max-w-xl">
          {[
            { k: "hook", l: "Hook", v: sub.hook },
            { k: "estrutura", l: "Structure", v: sub.estrutura },
            { k: "dica", l: "Tip", v: sub.dica },
          ].map(f => (
            <div key={f.k}>
              <div className="text-[9px] tracking-widest uppercase mb-1" style={{ fontFamily: "'DM Mono',monospace", color: format.color }}>{f.l}</div>
              <div className="text-xs" style={{ color: "#ccc" }}>{f.v}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onGenerate} disabled={generating}
        className="text-[9px] tracking-wider uppercase py-3 px-8 rounded cursor-pointer border-none disabled:opacity-50"
        style={{ fontFamily: "'DM Mono',monospace", letterSpacing: "1px", background: format.color || "#e63946", color: "#fff" }}>
        {generating ? "Generating…" : `Generate Creative →`}
      </button>

      {output && (
        <div className="mt-6 p-4 rounded-xl whitespace-pre-wrap text-xs leading-relaxed" style={{ background: "#0e0e0e", border: "1px solid #1d1d1d", color: "#ccc", fontFamily: "'DM Mono',monospace", maxWidth: 720 }}>
          {output}
        </div>
      )}
    </div>
  );
}
