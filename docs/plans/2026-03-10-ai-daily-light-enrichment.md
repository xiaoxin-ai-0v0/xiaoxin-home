# AI Daily Light Enrichment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the daily AI archive rely on one compact model call, persist Chinese-first summaries, and remove raw source excerpts from the site.

**Architecture:** Keep Tavily as the daily source, but reduce the model payload to compact item metadata and short summaries. The generator writes a smaller archive shape, and Astro pages render only the Chinese summary fields plus the original link.

**Tech Stack:** Astro 5, Node 20, native `https`/`fetch`, GitHub Actions

---

### Task 1: Lock the new archive contract in tests

**Files:**
- Modify: `tests/ai-daily/enrich-provider.test.mjs`
- Modify: `tests/ai-daily/generate-archive.test.mjs`
- Modify: `tests/ai-daily/load.test.mjs`

**Step 1: Write the failing test**

Add assertions that:

- the model payload no longer includes raw content fields
- persisted archive items no longer include raw snippet/content fields
- loaders still return the smaller persisted shape

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ai-daily/enrich-provider.test.mjs tests/ai-daily/generate-archive.test.mjs tests/ai-daily/load.test.mjs`

Expected: FAIL because current code still includes raw source excerpts.

**Step 3: Write minimal implementation**

Update the tests only far enough to encode the new contract.

**Step 4: Run test to verify it fails correctly**

Run: `npm test -- tests/ai-daily/enrich-provider.test.mjs tests/ai-daily/generate-archive.test.mjs tests/ai-daily/load.test.mjs`

Expected: FAIL with assertions about removed fields or new payload shape.

**Step 5: Commit**

Commit message: `test: lock ai daily light enrichment contract`

### Task 2: Shrink the provider payload and persisted archive shape

**Files:**
- Modify: `scripts/ai-daily/core.mjs`
- Modify: `scripts/ai-daily/providers/openai-compatible.mjs`
- Modify: `scripts/ai-daily/generate.mjs`
- Modify: `src/lib/ai-daily/types.ts`

**Step 1: Implement compact model input**

Change the provider payload so each item only sends:

- `url`
- `title`
- `snippet`
- `source`
- `publishedAt`

**Step 2: Implement smaller persisted items**

Update archive generation to persist only:

- `id`
- `title`
- `titleZh`
- `url`
- `source`
- `publishedAt`
- `snippetZh`
- `tags`

**Step 3: Keep single-call flow**

Preserve the single enrichment call per day and merge returned items by URL.

**Step 4: Run targeted tests**

Run: `npm test -- tests/ai-daily/enrich-provider.test.mjs tests/ai-daily/generate-archive.test.mjs tests/ai-daily/load.test.mjs`

Expected: PASS

**Step 5: Commit**

Commit message: `feat: slim ai daily enrichment payload`

### Task 3: Remove raw source excerpts from the site

**Files:**
- Modify: `src/pages/ai-daily/index.astro`
- Modify: `src/pages/ai-daily/archive/[date].astro`
- Modify: `src/data/ai-daily/archive/2026-03-10.json`
- Modify: `src/data/ai-daily/latest.json`
- Modify: `src/data/ai-daily/manifest.json`

**Step 1: Update the UI**

Remove the raw source excerpt blocks and render only:

- Chinese title
- Chinese summary
- tags
- source
- source link

**Step 2: Refresh committed sample data**

Regenerate the committed archive files using the new archive shape.

**Step 3: Run full verification**

Run:

- `npm test`
- `npm run build`
- `npm run ai-daily:generate`

Expected:

- tests pass
- site builds
- generator completes and writes the smaller archive shape

**Step 4: Commit**

Commit message: `feat: present ai daily as chinese archive assets`
