# AI Daily Light Enrichment Design

## Goal

Keep the AI daily pipeline on a single model call per day, but make that call light enough to complete reliably on Volcengine Coding Plan while still producing Chinese-first assets for the site.

The archived data should prioritize:

- Chinese headline
- Chinese summary
- tags
- source link

The site should no longer display original raw snippets or raw content excerpts.

## Product Decision

The daily archive is a Chinese knowledge asset, not a raw crawler dump.

That means:

- raw links stay as provenance
- AI output becomes the primary content shown on the site
- raw snippets and raw content should not be rendered in the UI
- the archive file should store only the fields that support the final experience

## Constraints

- Keep Tavily as the discovery source.
- Keep one model call per day.
- Keep GitHub Pages deployment.
- Keep date-based JSON archives.
- Improve compatibility with `https://ark.cn-beijing.volces.com/api/coding`.

## Recommended Approach

Use a light-input, single-call enrichment flow.

Each daily run should:

1. Fetch real AI news from Tavily.
2. Normalize and dedupe results.
3. Build one compact model payload containing only:
   - original title
   - short source summary
   - source name
   - source URL
   - published date
4. Ask the model to return:
   - daily headline
   - daily overview
   - daily highlights
   - per-item Chinese title
   - per-item Chinese summary
   - per-item tags
5. Persist only the processed archive shape used by the site.

This keeps the request small enough to reduce timeout risk while still producing content that feels authored and reusable.

## Data Model Changes

Persisted archive items should contain:

- `id`
- `title`
- `titleZh`
- `url`
- `source`
- `publishedAt`
- `snippetZh`
- `tags`

Fields to remove from persisted archives:

- `snippet`
- `content`
- `contentZh`

The raw title can stay for traceability, but the UI should prefer `titleZh`.

## Prompt Strategy

The provider prompt should explicitly ask for concise output.

Rules:

- summarize from the supplied title and short summary only
- do not reproduce large source passages
- return valid JSON only
- keep each item summary brief
- keep tags to a small set

This matches the actual product need and avoids wasting tokens on large translations.

## UI Changes

`/ai-daily` and `/ai-daily/archive/[date]` should display:

- Chinese title
- Chinese summary
- tags
- source name
- source link

They should no longer show expandable raw source excerpts.

`/ai-daily/archive` should remain the time-based archive index.

## Fallback Behavior

If enrichment fails, the run should still produce a dated archive to preserve time continuity.

Fallback should remain operational, but the primary path is now designed to make successful enrichment much more likely by shrinking the request.

## Risks and Mitigations

- The model may still time out.
  - Mitigation: send only compact fields and keep one summary per item.
- The model may omit some items.
  - Mitigation: merge by URL and keep stable ordering from normalized input.
- The archive may lose raw source detail.
  - Mitigation: retain source links and original title for provenance.
