# AI Data Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a GitHub Pages-friendly AI news data foundation to `xiaoxin-home` with Tavily discovery, OpenAI-compatible enrichment, committed JSON archives, and Astro pages.

**Architecture:** A Node-based generator writes JSON assets into `src/data/ai-daily`, Astro loads those assets through small library helpers, and GitHub Actions runs the generator on a schedule before deploying Pages. The AI provider is abstracted behind OpenAI-compatible environment variables so the model backend is replaceable.

**Tech Stack:** Astro 5, TypeScript, Node 20, native `fetch`, GitHub Actions

---

### Task 1: Create AI daily types and fixtures

**Files:**
- Create: `src/lib/ai-daily/types.ts`
- Create: `src/data/ai-daily/.gitkeep`
- Create: `tests/ai-daily/fixtures/sample-archive.json`
- Create: `tests/ai-daily/normalize.test.mjs`

**Step 1: Write the failing test**

Add a test that expects raw Tavily-like results to normalize into stable AI daily item records.

**Step 2: Run test to verify it fails**

Run: `node --test tests/ai-daily/normalize.test.mjs`

**Step 3: Write minimal implementation**

Create shared types and normalization helpers that produce deterministic IDs, truncate content, and dedupe URLs.

**Step 4: Run test to verify it passes**

Run: `node --test tests/ai-daily/normalize.test.mjs`

**Step 5: Commit**

Commit message: `feat: add ai daily normalization helpers`

### Task 2: Build provider clients and generator

**Files:**
- Create: `scripts/ai-daily/providers/tavily.mjs`
- Create: `scripts/ai-daily/providers/openai-compatible.mjs`
- Create: `scripts/ai-daily/generate.mjs`
- Create: `tests/ai-daily/generate-archive.test.mjs`

**Step 1: Write the failing test**

Add a test that runs the generator with stubbed providers and expects archive, latest, and manifest files to be written.

**Step 2: Run test to verify it fails**

Run: `node --test tests/ai-daily/generate-archive.test.mjs`

**Step 3: Write minimal implementation**

Implement the Tavily client, OpenAI-compatible client, and generator pipeline with graceful fallback when AI enrichment is unavailable.

**Step 4: Run test to verify it passes**

Run: `node --test tests/ai-daily/generate-archive.test.mjs`

**Step 5: Commit**

Commit message: `feat: add ai daily generator pipeline`

### Task 3: Add Astro loaders and pages

**Files:**
- Create: `src/lib/ai-daily/load.ts`
- Create: `src/pages/ai-daily/index.astro`
- Create: `src/pages/ai-daily/archive/index.astro`
- Create: `src/pages/ai-daily/archive/[date].astro`
- Modify: `src/layouts/Layout.astro`
- Modify: `src/pages/index.astro`
- Create: `tests/ai-daily/load.test.mjs`

**Step 1: Write the failing test**

Add a test that expects the data loader to sort available archives and return the latest digest.

**Step 2: Run test to verify it fails**

Run: `node --test tests/ai-daily/load.test.mjs`

**Step 3: Write minimal implementation**

Implement data loaders and Astro pages using the existing site styling.

**Step 4: Run test to verify it passes**

Run: `node --test tests/ai-daily/load.test.mjs`

**Step 5: Commit**

Commit message: `feat: add ai daily pages`

### Task 4: Wire scripts, sample data, and scheduling

**Files:**
- Modify: `package.json`
- Create: `.env.example` entries if needed
- Modify: `.github/workflows/deploy-pages.yml`
- Create: `.github/workflows/ai-daily-update.yml`
- Create: `src/data/ai-daily/archive/2026-03-10.json`
- Create: `src/data/ai-daily/latest.json`
- Create: `src/data/ai-daily/manifest.json`

**Step 1: Write the failing test**

Add a test that expects sample data files to match the loader contract and the npm script entry to exist.

**Step 2: Run test to verify it fails**

Run: `node --test tests/ai-daily/*.test.mjs`

**Step 3: Write minimal implementation**

Add scripts, sample data, and scheduled workflow integration.

**Step 4: Run test to verify it passes**

Run: `node --test tests/ai-daily/*.test.mjs`

**Step 5: Commit**

Commit message: `feat: schedule ai daily updates`

### Task 5: Final verification

**Files:**
- Review all modified files

**Step 1: Run targeted tests**

Run: `node --test tests/ai-daily/*.test.mjs`

**Step 2: Run full site build**

Run: `npm run build`

**Step 3: Inspect generated routes and data references**

Confirm the AI daily pages build under the GitHub Pages base path.

**Step 4: Commit**

Commit message: `feat: add ai daily data foundation`
