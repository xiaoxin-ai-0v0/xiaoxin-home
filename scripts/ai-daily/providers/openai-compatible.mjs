import { buildFallbackSummary } from '../core.mjs';

function extractJsonObject(rawText) {
  const cleaned = rawText.trim();

  if (cleaned.startsWith('{')) {
    return cleaned;
  }

  const fenceMatch = cleaned.match(/```json\s*([\s\S]*?)```/i) || cleaned.match(/```\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }

  throw new Error('No JSON object found in model response');
}

function buildCompletionEndpoints(baseUrl) {
  const normalized = baseUrl.replace(/\/$/, '');
  if (normalized.endsWith('/chat/completions')) {
    return [normalized];
  }

  return [`${normalized}/chat/completions`, normalized];
}

export async function enrichAiDailyItems(items, options = {}) {
  const {
    apiKey = process.env.AI_API_KEY,
    baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    model = process.env.AI_MODEL,
    date,
  } = options;

  if (!apiKey || !model || items.length === 0) {
    return {
      items,
      summary: buildFallbackSummary({ date, items }),
      provider: 'none',
    };
  }

  const requestBody = JSON.stringify({
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: [
          'You are an AI news editor.',
          'Return valid JSON only.',
          'For each news item, translate title/snippet/content into concise Chinese and add up to 3 tags.',
          'Also create a summary object with headline, overview, and 3 highlight strings.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          date,
          items: items.map((item) => ({
            url: item.url,
            title: item.title,
            snippet: item.snippet,
            content: item.content,
          })),
          outputShape: {
            summary: {
              headline: 'string',
              overview: 'string',
              highlights: ['string'],
            },
            items: [
              {
                url: 'string',
                titleZh: 'string',
                snippetZh: 'string',
                contentZh: 'string',
                tags: ['string'],
              },
            ],
          },
        }),
      },
    ],
  });

  let payload = null;
  let lastError = null;

  for (const endpoint of buildCompletionEndpoints(baseUrl)) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: requestBody,
    });

    if (response.ok) {
      payload = await response.json();
      break;
    }

    lastError = new Error(`AI enrichment failed: ${response.status}`);

    if (response.status !== 404) {
      throw lastError;
    }
  }

  if (!payload) {
    throw lastError || new Error('AI enrichment failed');
  }

  const message = payload.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(extractJsonObject(message));

  const byUrl = new Map(
    Array.isArray(parsed.items)
      ? parsed.items.filter((item) => item?.url).map((item) => [item.url, item])
      : [],
  );

  const enrichedItems = items.map((item) => {
    const processed = byUrl.get(item.url) || {};

    return {
      ...item,
      titleZh: processed.titleZh?.trim() || item.titleZh || item.title,
      snippetZh: processed.snippetZh?.trim() || item.snippetZh || item.snippet,
      contentZh: processed.contentZh?.trim() || item.contentZh || item.content,
      tags: Array.isArray(processed.tags) ? processed.tags.filter(Boolean).slice(0, 5) : item.tags,
    };
  });

  return {
    items: enrichedItems,
    summary: parsed.summary || buildFallbackSummary({ date, items: enrichedItems }),
    provider: model,
  };
}
