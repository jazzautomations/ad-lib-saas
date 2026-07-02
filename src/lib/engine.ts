import type { AdFormat, CreativeBrief, GeneratedAd, SubFormat } from "./types";
import { FORMATS } from "./formats";

export function getFormats(): AdFormat[] {
  return FORMATS;
}

export function getFormatById(id: number): AdFormat | undefined {
  return FORMATS.find(f => f.id === id);
}

export function getFormatByName(name: string): AdFormat | undefined {
  return FORMATS.find(f => f.name.toLowerCase() === name.toLowerCase());
}

export function suggestFormats(brief: Partial<CreativeBrief>): AdFormat[] {
  let results = [...FORMATS];
  if (brief.funnelStage) {
    results = results.filter(f => f.funil.includes(brief.funnelStage));
  }
  return results.sort(() => Math.random() - 0.5);
}

export function generateScript(format: AdFormat, sub: SubFormat, brief: CreativeBrief): string {
  const script = [
    `# ${brief.brand} — ${sub.name}`,
    ``,
    `**Format:** ${format.name} » ${sub.name}`,
    `**Tagline:** ${sub.hook?.replace(/["']/g, '')}`,
    ``,
    `## Quando usar`,
    `${sub.quando}`,
    ``,
    `## Estrutura`,
    `${sub.estrutura}`,
    ``,
    `## Produção`,
    `${sub.dica || "Seguir a estrutura padrão do formato."}`,
  ];
  return script.join("\n");
}

export function suggestFormatsForBrief(brief: CreativeBrief): { format: AdFormat; sub: SubFormat; score: number }[] {
  const results: { format: AdFormat; sub: SubFormat; score: number }[] = [];
  for (const format of FORMATS) {
    for (const sub of format.subs) {
      let score = 0;
      if (brief.funnelStage && (sub.funil === brief.funnelStage || (Array.isArray(sub.funil) && sub.funil.includes(brief.funnelStage)))) score += 3;
      if (brief.platform && (sub.tipo === "video" || sub.tipo === "mixed")) score += 1;
      results.push({ format, sub, score });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}
