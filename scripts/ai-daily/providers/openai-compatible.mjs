import http from 'node:http';
import https from 'node:https';

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

function withTimeout(promise, timeoutMs, label) {
  let timerId;

  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timerId);
  });
}

function isAnthropicCodingBaseUrl(baseUrl) {
  return /\/api\/coding\/?$/i.test(baseUrl.replace(/\/$/, ''));
}

function buildCompletionEndpoints(baseUrl) {
  const normalized = baseUrl.replace(/\/$/, '');
  if (normalized.endsWith('/chat/completions')) {
    return [normalized];
  }

  return [`${normalized}/chat/completions`, normalized];
}

function buildMessagesEndpoint(baseUrl) {
  const normalized = baseUrl.replace(/\/$/, '');
  if (normalized.endsWith('/v1/messages')) {
    return normalized;
  }

  return `${normalized}/v1/messages`;
}

function getRequestClient(targetUrl) {
  return new URL(targetUrl).protocol === 'http:' ? http : https;
}

function requestJsonWithNodeHttp({ url, method = 'POST', headers, body, timeoutMs, label }) {
  return new Promise((resolve, reject) => {
    const requestClient = getRequestClient(url);
    const request = requestClient.request(url, { method, headers }, (response) => {
      let raw = '';

      response.on('data', (chunk) => {
        raw += chunk;
      });

      response.on('end', () => {
        const statusCode = response.statusCode || 0;

        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`${label} failed: ${statusCode}${raw ? ` ${raw}` : ''}`));
          return;
        }

        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(new Error(`${label} returned invalid JSON: ${error.message}`));
        }
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`${label} timed out after ${timeoutMs}ms`));
    });

    request.on('error', (error) => {
      reject(error);
    });

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

function buildUserPayload(date, items) {
  return JSON.stringify({
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
  });
}

function buildSystemPrompt() {
  return [
    'You are an AI news editor.',
    'Return valid JSON only.',
    'For each news item, translate title/snippet/content into concise Chinese and add up to 3 tags.',
    'Also create a summary object with headline, overview, and 3 highlight strings.',
  ].join(' ');
}

function extractMessageText(payload) {
  if (payload?.choices?.[0]?.message?.content) {
    return payload.choices[0].message.content;
  }

  if (Array.isArray(payload?.content)) {
    return payload.content
      .filter((block) => block?.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('\n');
  }

  return '';
}

async function requestOpenAICompatible({ apiKey, baseUrl, model, date, items, requestTimeoutMs }) {
  const requestBody = JSON.stringify({
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(),
      },
      {
        role: 'user',
        content: buildUserPayload(date, items),
      },
    ],
  });

  let payload = null;
  let lastError = null;

  for (const endpoint of buildCompletionEndpoints(baseUrl)) {
    const response = await withTimeout(
      fetch(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(requestTimeoutMs),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: requestBody,
      }),
      requestTimeoutMs,
      'AI enrichment request',
    );

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

  return payload;
}

async function requestAnthropicCompatible({ apiKey, baseUrl, model, date, items, requestTimeoutMs }) {
  return requestJsonWithNodeHttp({
    url: buildMessagesEndpoint(baseUrl),
    method: 'POST',
    timeoutMs: requestTimeoutMs,
    label: 'AI enrichment request',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      stream: false,
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: buildUserPayload(date, items),
        },
      ],
    }),
  });
}

export async function enrichAiDailyItems(items, options = {}) {
  const apiKey = options.apiKey ?? process.env.AI_API_KEY;
  const baseUrl = options.baseUrl ?? process.env.AI_BASE_URL ?? 'https://api.openai.com/v1';
  const model = options.model ?? process.env.AI_MODEL;
  const date = options.date;
  const requestTimeoutMs =
    options.requestTimeoutMs ?? (isAnthropicCodingBaseUrl(baseUrl) ? 120000 : 30000);

  if (!apiKey || !model || items.length === 0) {
    return {
      items,
      summary: buildFallbackSummary({ date, items }),
      provider: 'none',
    };
  }

  const payload = isAnthropicCodingBaseUrl(baseUrl)
    ? await requestAnthropicCompatible({ apiKey, baseUrl, model, date, items, requestTimeoutMs })
    : await requestOpenAICompatible({ apiKey, baseUrl, model, date, items, requestTimeoutMs });

  const message = extractMessageText(payload);
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
