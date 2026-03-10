# AI Data Foundation Design

## Goal

Build a durable AI news data pipeline inside `xiaoxin-home` that:

- uses Tavily to discover real AI news daily,
- uses an OpenAI-compatible model endpoint to translate and summarize,
- commits structured JSON archives into the repo as a long-term asset,
- exposes the latest digest and archive through Astro pages on GitHub Pages.

## Constraints

- Repository stays `xiaoxin-home`.
- Deployment stays on GitHub Pages.
- Search continues to use `TAVILY_API_KEY`.
- AI processing must work through configurable OpenAI-compatible settings so the model provider can change later.
- The first version only covers the `AI` topic.
- Stored data should be structured text, not full HTML snapshots or heavy media.

## Architecture

The feature is split into four layers:

1. `scripts/ai-daily/`: data generation pipeline
2. `src/data/ai-daily/`: committed JSON assets
3. `src/lib/ai-daily/`: shared loaders and types for Astro pages
4. `src/pages/ai-daily/`: public UI for latest digest and archive

The generator fetches raw results from Tavily, normalizes them, optionally enriches them with an OpenAI-compatible model, writes a dated archive file, and refreshes a small manifest plus `latest.json`.

## Data Model

### Archive file

Path:

- `src/data/ai-daily/archive/YYYY-MM-DD.json`

Shape:

- `date`
- `generatedAt`
- `topic`
- `source`
- `counts`
- `items[]`
- `summary`

Each item stores:

- `id`
- `title`
- `titleZh`
- `url`
- `source`
- `publishedAt`
- `snippet`
- `snippetZh`
- `content`
- `contentZh`
- `tags[]`

The data keeps both raw and processed text so it can be reused later for search, weekly rollups, or other AI workflows.

### Index files

- `src/data/ai-daily/latest.json`
- `src/data/ai-daily/manifest.json`

`manifest.json` contains available dates and small metadata for building archive pages efficiently.

## Provider Model

Search provider:

- Tavily only for the first version

AI provider:

- OpenAI-compatible HTTP API via environment variables
- `AI_API_KEY`
- `AI_BASE_URL`
- `AI_MODEL`

This keeps the code portable across Volcengine and other compatible providers.

## Build and Deployment Flow

Local:

1. `npm run ai-daily:generate`
2. generated JSON lands in `src/data/ai-daily/`
3. `npm run build`

GitHub Actions:

1. scheduled workflow runs daily
2. installs dependencies
3. runs generator with secrets
4. commits updated JSON back to `main`
5. builds and deploys Pages

## UI Scope

First version adds:

- homepage section linking to the AI digest
- `/ai-daily` latest digest page
- `/ai-daily/archive` archive list page
- per-day archive pages generated from JSON files

The UI stays lightweight and uses the site’s existing Astro design language instead of copying the original static site wholesale.

## Non-Goals

- multi-topic support
- full-text webpage archiving
- image scraping and storage
- advanced search UI
- complex frontend interactions copied from the original project

## Risks and Mitigations

- Tavily returns noisy or duplicate results
  - normalize URLs, dedupe by URL, limit item count
- AI provider may be unavailable
  - keep raw data, fall back to untranslated text
- repo grows over time
  - store only structured text fields and concise content excerpts
- scheduled commits can cause empty updates
  - skip commit when no data file changed
