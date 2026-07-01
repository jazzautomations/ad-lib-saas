
# AD.LIB Studio Architecture

## System Design

### Core Philosophy

AD.LIB Studio is built on a **library-first** architecture. Every creative starts as a format entry in the library, which maps to a render template, which maps to a production pipeline.

```
Format Object (in library)
  → Template (render-agnostic blueprint)
    → Render Plan (engine-specific instructions)
      → Asset Package (video/image files + metadata)
```

### Package Structure

```
packages/
├── format-engine/     # Core format definitions and query API
├── render-engine/     # Render engine abstraction layer
├── agent-pipeline/    # Multi-agent orchestration
└── asset-manager/     # File upload, processing, storage
```

### Data Flow

```
Source Input → Strategist → Format Selection → Copywriter 
  → Copy + Format → Editor → Render Plan → Render Engine → Asset
```

### Agent Pipeline Detail

Each agent is an LLM call with a specific role prompt:

1. **Strategist Prompt**: Given a brief, select optimal formats considering:
   - Funnel stage compatibility
   - Media type match (video/image/mixed)
   - Platform aspect ratio requirements
   - Brand/product category conventions
   - Content inventory assets available

2. **Copywriter Prompt**: For each selected format + sub-format:
   - Write hook (attention-grabbing opener)
   - Write body/structure following sub-format's `estrutura`
   - Write CTA aligned with funnel stage
   - Keep within platform duration limits

3. **Editor Prompt**: Convert the copy + format into render instructions:
   - Select engine (Remotion for motion, HyperFrames for fast, etc.)
   - Map assets to render slots
   - Define animations, transitions, timing
   - Output as render plan JSON

4. **QA Prompt**: Validate the render output:
   - Check aspect ratio
   - Verify duration
   - Check brand compliance
   - Report any issues

### Render Engine Selection

The selection algorithm considers:
1. Format media type (video → prefer video engines)
2. Duration (longer → prefer Remotion for complex edits)
3. Asset complexity (motion graphics → Remotion, simple → HyperFrames)
4. Scale (bulk → Creatomate)
5. AI needed (AI B-roll → Replicate/Veo)

## Deployment

### zo.space Route (Fast Path)

The API can run on zo.space as Hono API routes:

```
/api/suggest     → POST /suggest
/api/formats     → GET /formats
/api/render/plan → POST /render/plan
```

### Standalone Server

```bash
cd apps/api
bun src/server.ts
```

### Zo Machine (Full Platform)

```bash
register_user_service ad-lib-api --mode=http --entrypoint="bun src/server.ts"
```

## Extending

### Adding a New Format

1. Add to `packages/format-engine/src/formats.ts`
2. Create Remotion template in `packages/render-engine/templates/remotion/{format-name}/`
3. Add HyperFrames template in `packages/render-engine/templates/hyperframes/{format-name}/`
4. Register in `packages/format-engine/src/index.ts`

### Adding a Render Engine

1. Add to `packages/render-engine/src/engines.ts`
2. Implement the interface:
```typescript
interface EngineImplementation {
  render(plan: RenderPlan): Promise<RenderOutput>;
  preview(plan: RenderPlan): Promise<string>;
}
```
3. Register in the engine selector
