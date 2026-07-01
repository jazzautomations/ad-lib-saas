import { Hono } from "hono";
import { cors } from "hono/cors";
import { FORMATS, getFormatById, searchFormats } from "@ad-lib/format-engine";
import { ENGINES, pickEngine } from "@ad-lib/render-engine";

const app = new Hono();
app.use("/*", cors());

app.get("/", (c) => c.json({ name: "AD.LIB Studio API", version: "0.1.0", formats: FORMATS.length }));

// Get all formats
app.get("/formats", (c) => {
  const funnel = c.req.query("funnel");
  const media = c.req.query("media");
  const q = c.req.query("q");
  
  let results = [...FORMATS];
  if (funnel) results = results.filter(f => f.funil.includes(funnel as any));
  if (media) results = results.filter(f => f.tipos.includes(media as any));
  if (q) results = searchFormats(q);
  
  return c.json({ count: results.length, formats: results });
});

// Get a single format by ID
app.get("/formats/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  const format = getFormatById(id);
  if (!format) return c.json({ error: "Format not found" }, 404);
  return c.json({ format });
});

// Get available render engines
app.get("/engines", (c) => c.json({ engines: Object.values(ENGINES) }));

// Suggest formats for a brief
app.post("/suggest", async (c) => {
  const body = await c.req.json();
  const { brief, funnel, media } = body;
  
  let candidates = [...FORMATS];
  if (funnel) candidates = candidates.filter(f => f.funil.includes(funnel));
  if (media) candidates = candidates.filter(f => f.tipos.includes(media));
  
  return c.json({ suggestions: candidates.slice(0, 5), total: candidates.length });
});

// Render preview / plan for a format
app.post("/render/plan", async (c) => {
  const body = await c.req.json();
  const { formatId, subFormatIndex, engine, inputs } = body;
  
  const format = getFormatById(formatId);
  if (!format) return c.json({ error: "Format not found" }, 404);
  
  const selectedEngine = pickEngine(format, { preferred: engine });
  return c.json({
    format: format.name,
    engine: selectedEngine.name,
    template: `${format.name.toLowerCase().replace(/\s+/g, "-")}-${subFormatIndex}`,
    inputs,
    estimatedDuration: "pending",
  });
});

export default app;
