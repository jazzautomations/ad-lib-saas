import { FORMATS } from "./formats";
import type { AdFormat, SubFormat } from "./types";

export class FormatEngine {
  listAll(): AdFormat[] {
    return FORMATS;
  }

  findById(id: number): AdFormat | undefined {
    return FORMATS.find(f => f.id === id);
  }

  findByName(query: string): AdFormat | undefined {
    const q = query.toLowerCase();
    return FORMATS.find(f => f.name.toLowerCase().includes(q));
  }

  filterByMedia(type: string): AdFormat[] {
    const t = type.toLowerCase();
    return FORMATS.filter(f => f.tipos.some(tip => tip.includes(t)));
  }

  filterByFunnel(stage: string): AdFormat[] {
    return FORMATS.filter(f => f.funil.includes(stage));
  }

  suggestFormats(opts: { funnel?: string; offerType?: string; platform?: string }): Array<AdFormat & { rationale: string }> {
    let pool = FORMATS;
    if (opts.funnel) pool = pool.filter(f => f.funil.includes(opts.funnel!));
    if (opts.funnel === "top") {
      // Top-funnel: prioritize viral, native, organic-feeling formats
      const prioritized = pool.filter(f => [7, 10, 17, 5].includes(f.id));
      const rest = pool.filter(f => ![7, 10, 17, 5].includes(f.id)).slice(0, 3);
      return [...prioritized, ...rest].slice(0, 6).map(f => ({
        ...f, rationale: "High organic engagement, native feel — ideal for cold audiences."
      }));
    }
    if (opts.funnel === "mid") {
      const prioritized = pool.filter(f => [1, 9, 12, 13].includes(f.id));
      const rest = pool.filter(f => ![1, 9, 12, 13].includes(f.id)).slice(0, 2);
      return [...prioritized, ...rest].slice(0, 6).map(f => ({
        ...f, rationale: "Authority & trust-building formats — great for warm audiences."
      }));
    }
    if (opts.funnel === "btm") {
      const prioritized = pool.filter(f => [18, 15, 16, 9].includes(f.id));
      return prioritized.slice(0, 6).map(f => ({
        ...f, rationale: "Conversion-focused — scarcity, proof, direct offer."
      }));
    }
    return pool.slice(0, 6).map(f => ({
      ...f, rationale: "Versatile cross-funnel format."
    }));
  }

  getSubFormats(formatId: number): SubFormat[] {
    const f = this.findById(formatId);
    return f?.subs || [];
  }

  countFormats(): { total: number; byMedia: Record<string, number>; byFunnel: Record<string, number> } {
    const byMedia: Record<string, number> = {};
    const byFunnel: Record<string, number> = {};
    FORMATS.forEach(f => {
      f.tipos.forEach(t => { byMedia[t] = (byMedia[t] || 0) + 1; });
      f.funil.forEach(st => { byFunnel[st] = (byFunnel[st] || 0) + 1; });
    });
    return { total: FORMATS.length, byMedia, byFunnel };
  }
}
