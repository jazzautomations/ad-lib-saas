#!/usr/bin/env bun
import { FormatEngine, FORMATS } from "@ad-lib/format-engine";

const cmd = process.argv[2];
const engine = new FormatEngine();

function help() {
  console.log(`
AD.LIB Studio CLI — Agentic Ad Creative Generator

Usage:
  adlib list                      List all 18 formats
  adlib show <id|name>            Show format details
  adlib strategist <brief>        Run strategist agent
  adlib generate <formatId>       Generate a creative

Examples:
  adlib list
  adlib show "TALKING HEAD"
  adlib strategist "fitness app, 30-day challenge"
  adlib generate 7
`);
}

async function main() {
  switch (cmd) {
    case "list": {
      console.log(`\n  AD.LIB — ${FORMATS.length} Formats\n`);
      FORMATS.forEach(f => {
        const funil = f.funil.join("/").toUpperCase();
        const tipos = f.tipos.map(t => t.toUpperCase()).join("/");
        console.log(`  ${String(f.id).padEnd(2)} ${f.icon} ${f.name.padEnd(20)} ${tipos.padEnd(8)} [${funil}] — ${f.subs.length} subs`);
      });
      break;
    }
    case "show": {
      const query = process.argv[3];
      if (!query) { help(); return; }
      const format = engine.findByName(query) || engine.findById(parseInt(query));
      if (!format) { console.log(`Format not found: ${query}`); return; }
      console.log(`\n  ${format.icon} ${format.name}`);
      console.log(`  ${"=".repeat(format.name.length + 4)}`);
      console.log(`  ${format.desc}`);
      console.log(`  Types: ${format.tipos.join(", ")} · Funnel: ${format.funil.join(", ")}`);
      console.log(`  ${format.subs.length} sub-formats:\n`);
      format.subs.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name}`);
        console.log(`     When: ${s.quando}`);
        console.log(`     Hook: ${s.hook}`);
        console.log(`     Structure: ${s.estrutura}`);
        console.log();
      });
      break;
    }
    case "strategist": {
      const brief = process.argv[3] || "No brief provided";
      console.log(`\n  [Strategist Agent] Analyzing: "${brief}"`);
      console.log(`  ${"-".repeat(50)}`);
      const suggestion = engine.suggestFormats({ funnel: "top", offerType: "service" });
      suggestion.forEach(f => {
        console.log(`  → ${f.name} (${f.rationale})`);
      });
      break;
    }
    case "generate": {
      const id = parseInt(process.argv[3]);
      const format = engine.findById(id);
      if (!format) { console.log(`Format #${id} not found`); return; }
      console.log(`\n  [Generator] Generating creative for "${format.name}"...`);
      console.log(`  Using format #${format.id} with ${format.subs.length} sub-format variations.`);
      console.log(`  Render engines available: remotion, hyperframes, shotstack`);
      break;
    }
    default:
      help();
  }
}

main().catch(console.error);
