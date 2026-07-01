<p align="center">
  <img src="apps/web/adlib-og.png" alt="AD.LIB Studio" width="600">
</p>

<h1 align="center">AD·LIB Studio</h1>
<p align="center"><em>Deploy any ad format from one source creative.</em></p>

<p align="center">
  <b>From the library to the render.</b> AD.LIB Studio is an open-source SaaS that takes your source creative — a video, image, product link, or brief — and generates every ad format from a battle-tested library of 18 formats and 120+ sub-variations, powered by agentic video editing pipelines.
</p>

<p align="center">
  <a href="#formats">📋 Formats</a> ·
  <a href="#architecture">🏗️ Architecture</a> ·
  <a href="#pipeline">🔄 Pipeline</a> ·
  <a href="#render-engines">🎬 Engines</a> ·
  <a href="#getting-started">🚀 Getting Started</a> ·
  <a href="#roadmap">🗺️ Roadmap</a>
</p>

---

## What is AD.LIB Studio?

The original [AD.LIB](https://adlib-seven.vercel.app) is a curated library of 18 proven ad creative formats. It's a **reference** — it tells you what exists.

**AD.LIB Studio** makes it **executable**. It's the engine that turns that reference into actual creatives.

Instead of knowing formats exist, you tell AD.LIB Studio: *"Here's my product video. Make me a Talking Head, a Demo, a Split Screen, and 3 UGC variants for TikTok mid-funnel"* — and it outputs ready-to-post MP4s, PNGs, and GIFs.

## The 18 Formats

| # | Format | Type | Funnel | Sub-formats | Best For |
|---|--------|------|--------|-------------|----------|
| 1 | **Talking Head** | 🎤 Video | Top/Mid/Btm | 6 | Testimonials, hot takes, founder content |
| 2 | **Fake Podcast** | 🎙️ Video | Top/Mid | 3 | Authority building, storytelling |
| 3 | **News Format** | 📺 Video/Mixed | Top | 3 | Authority, breaking announcements |
| 4 | **Interview / Street** | 🎥 Video | Top | 3 | Social proof, curiosity |
| 5 | **Skit** | 🎭 Video | Top/Mid | 3 | Entertainment, virality |
| 6 | **POV** | 👁️ Video | Top/Mid | 3 | Relatability, before/after |
| 7 | **Question Box** | ❓ Video | Top | 3 | Engagement, Q&A |
| 8 | **Reaction** | 😲 Video | Top/Mid | 3 | Virality, commentary |
| 9 | **Split Screen** | 📱 Video/Image/Mixed | All | 3 | Comparison, contrast |
| 10 | **Native UGC** | 📸 Video | Top/Mid | 4 | Authenticity, FOMO |
| 11 | **Green Screen** | 🟢 Video | Top/Mid | 3 | Results showcase, education |
| 12 | **Narration / VO** | 🎧 Mixed/Video | All | 3 | Evergreen, VSLs |
| 13 | **Storytelling** | 📖 Video | Top/Mid | 3 | Emotional connection |
| 14 | **Listicle / Top N** | 📋 Video/Image | Top | 3 | Education, value |
| 15 | **Demo** | 🛠️ Video | Mid/Btm | 3 | Product proof, tutorials |
| 16 | **Static / Image** | 🖼️ Image | All | 4 | Retargeting, display |
| 17 | **Trend Hijack** | 🔥 Video | Top | 3 | Virality, algorithm boost |
| 18 | **Urgency / Direct Offer** | ⚡ Video/Image | Btm | 4 | Conversions, promos |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    AD.LIB Studio                      │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Format       │  │ Agent        │  │ Render      │  │
│  │ Engine       │  │ Pipeline     │  │ Engine      │  │
│  │              │  │              │  │             │  │
│  │ • 18 formats │  │ • Strategist │  │ • Remotion  │  │
│  │ • 120+ subs  │  │ • Copywriter │  │ • HyperFrames│ │
│  │ • Search     │  │ • Editor     │  │ • Shotstack │  │
│  │ • Filter     │  │ • QA         │  │ • Creatomate│  │
│  └──────┬───────┘  └──────┬───────┘  │ • AI Video  │  │
│         │                 │          └──────┬───────┘  │
│         └─────────────────┼─────────────────┘          │
│                           │                           │
│                    ┌──────┴──────┐                    │
│                    │  API Layer  │                    │
│                    │  (Hono/Fast)│                    │
│                    └──────┬──────┘                    │
│                           │                           │
│              ┌────────────┼────────────┐              │
│              │            │            │              │
│         ┌────┴───┐  ┌────┴───┐  ┌────┴───┐          │
│         │ Web    │  │ CLI    │  │ Agent  │          │
│         │ App    │  │ Client │  │ Skill  │          │
│         └────────┘  └────────┘  └────────┘          │
└─────────────────────────────────────────────────────┘
```

## Pipeline

The **4-Agent Pipeline** is the brain:

### 1. Strategist
- Ingests source creative (URL, file, brief, product link)
- Analyzes funnel stage, platform, audience, brand voice
- Selects 3-5 optimal formats from the 18
- Ranks by predicted performance for the brief

### 2. Copywriter
- For each selected format, generates format-native copy
- Writes hooks that fit the sub-format structure
- Generates CTA variants (soft → hard)
- Adapts voice to brand guidelines

### 3. Editor
- Picks the optimal render engine per format
- Assembles the creative: assets + copy + format template
- Renders low-res preview for review
- Supports batch: one source → N formats in parallel

### 4. QA / Review
- Validates aspect ratio, duration, resolution per platform
- Checks brand compliance (colors, logo, tone)
- Generates delivery package (MP4 + thumbnail + caption)

## Render Engines

Six render engines, each for its strength:

| Engine | Strength | Best For |
|--------|----------|----------|
| **Remotion** | React-based programmable video | Motion graphics, branded content, text-heavy ads |
| **HyperFrames** | Deterministic HTML/CSS → MP4 | AI-agent-native editing, fast iteration |
| **Shotstack** | Cloud video editing API | Stock footage at scale, automated assembly |
| **Creatomate** | Template-based bulk generation | Hundreds of variants from one template |
| **Replicate** | AI image/video generation | B-roll, backgrounds, asset creation |
| **Google Veo** | State-of-the-art video generation | Cinematic AI video, surreal visuals |

## Getting Started

```bash
# Clone the repo
git clone https://github.com/jazzautomations/ad-lib-saas.git
cd ad-lib-saas

# Install dependencies
bun install

# Explore the format library
bun run format-engine:explore

# Start the API server
bun run api:dev

# Visit the web app
open apps/web/index.html
```

### Using as an AI Agent Skill

Drop the `skills/ad-lib-agent/SKILL.md` into any AI coding agent workspace (Claude Code, Cursor, GitHub Copilot) — and your AI instantly knows all 18 formats, sub-variations, hooks, structures, and the agent pipeline.

## Roadmap

### Phase 1 — Foundation ✅
- [x] Format engine with all 18 formats + 60 sub-formats
- [x] Render engine abstraction (6 engines)
- [x] Agent pipeline orchestration shell
- [x] REST API
- [x] Agent skill for AI coding assistants

### Phase 2 — MVP 🚀
- [ ] Remotion template for top 5 formats
- [ ] HyperFrames template pack
- [ ] Upload asset → auto-classify source
- [ ] Single-format render with copy generation
- [ ] Web dashboard: browse formats, trigger renders

### Phase 3 — Scale 📈
- [ ] Multi-format batch render
- [ ] Agent pipeline running LLM calls (Groq/OpenAI)
- [ ] Integrations: Meta Ads, TikTok, Google Ads
- [ ] Brand kit manager (colors, fonts, logos)
- [ ] A/B format suggestions based on brief

### Phase 4 — Platform 🌐
- [ ] Full API with auth
- [ ] Webhook triggers (render → post to ad platform)
- [ ] CLI tool for CI/CD pipelines
- [ ] Collaborative campaign management
- [ ] Usage analytics

---

<p align="center">
  Built on the <a href="https://adlib-seven.vercel.app">AD.LIB creative format library</a>.<br>
  <em>From format reference to format factory.</em>
</p>
