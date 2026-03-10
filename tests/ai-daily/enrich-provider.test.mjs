import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';

import { enrichAiDailyItems } from '../../scripts/ai-daily/providers/openai-compatible.mjs';

function buildItems() {
  return [
    {
      id: '2026-03-10-openai-launches-new-agent-tools',
      title: 'OpenAI launches new agent tools',
      titleZh: 'OpenAI launches new agent tools',
      url: 'https://example.com/openai-agent-tools',
      source: 'Example',
      publishedAt: '2026-03-10T02:30:00.000Z',
      snippet: 'OpenAI introduced a new toolkit for agent builders.',
      snippetZh: 'OpenAI introduced a new toolkit for agent builders.',
      content: 'OpenAI introduced a new toolkit for agent builders, including orchestration support.',
      contentZh: 'OpenAI introduced a new toolkit for agent builders, including orchestration support.',
      tags: [],
    },
  ];
}

function installHttpsSuccessStub(t, responsePayload) {
  const originalHttpsRequest = https.request;
  let request = null;
  let writtenBody = '';

  t.after(() => {
    https.request = originalHttpsRequest;
  });

  https.request = (url, options, callback) => {
    request = { url, options };

    const responseHandlers = {};
    const response = {
      statusCode: 200,
      on(event, handler) {
        responseHandlers[event] = handler;
      },
    };

    queueMicrotask(() => {
      callback(response);
      responseHandlers.data?.(JSON.stringify(responsePayload));
      responseHandlers.end?.();
    });

    return {
      setTimeout() {},
      on() {},
      write(chunk) {
        writtenBody += chunk;
      },
      end() {},
      destroy(error) {
        throw error;
      },
    };
  };

  return {
    getRequest() {
      return request;
    },
    getWrittenBody() {
      return writtenBody;
    },
  };
}

test('enrichAiDailyItems uses anthropic coding protocol for api/coding base urls', async (t) => {
  const stub = installHttpsSuccessStub(t, {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          summary: {
            headline: 'AI summary generated',
            overview: 'Anthropic style endpoint returned a structured summary.',
            highlights: ['Coding Plan transport adapted'],
          },
          items: [
            {
              url: 'https://example.com/openai-agent-tools',
              titleZh: 'OpenAI new agent tools',
              snippetZh: 'OpenAI released a new toolkit for agent builders.',
              contentZh: 'OpenAI released a new toolkit for agent builders.',
              tags: ['OpenAI', 'Agent'],
            },
          ],
        }),
      },
    ],
  });

  const result = await enrichAiDailyItems(buildItems(), {
    apiKey: 'test-key',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/coding',
    model: 'minimax-m2.5',
    date: '2026-03-10',
  });

  const request = stub.getRequest();
  const body = JSON.parse(stub.getWrittenBody());
  const payload = JSON.parse(body.messages[0].content);

  assert.equal(String(request.url), 'https://ark.cn-beijing.volces.com/api/coding/v1/messages');
  assert.equal(request.options.headers['x-api-key'], 'test-key');
  assert.equal(request.options.headers.Authorization, 'Bearer test-key');
  assert.equal(request.options.headers['anthropic-version'], '2023-06-01');
  assert.equal(body.model, 'minimax-m2.5');
  assert.equal(body.max_tokens, 4000);
  assert.equal(body.stream, false);
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].source, 'Example');
  assert.ok(!('publishedAt' in payload.items[0]));
  assert.ok(!('content' in payload.items[0]));
  assert.equal(result.summary.headline, 'AI summary generated');
  assert.equal(result.items[0].titleZh, 'OpenAI new agent tools');
  assert.deepEqual(result.items[0].tags, ['OpenAI', 'Agent']);
});

test('enrichAiDailyItems uses node https transport for coding endpoints', async (t) => {
  const originalFetch = global.fetch;
  const stub = installHttpsSuccessStub(t, {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          summary: {
            headline: 'AI summary ready',
            overview: 'Coding endpoint responded through node https transport.',
            highlights: ['Using https.request'],
          },
          items: [
            {
              url: 'https://example.com/openai-agent-tools',
              titleZh: 'OpenAI agent tools',
              snippetZh: 'A short translated snippet',
              contentZh: 'A longer translated content block',
              tags: ['OpenAI'],
            },
          ],
        }),
      },
    ],
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () => {
    throw new Error('fetch should not be used for coding endpoints');
  };

  const result = await enrichAiDailyItems(buildItems(), {
    apiKey: 'test-key',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/coding',
    model: 'minimax-m2.5',
    date: '2026-03-10',
  });

  assert.equal(String(stub.getRequest().url), 'https://ark.cn-beijing.volces.com/api/coding/v1/messages');
  assert.match(stub.getWrittenBody(), /"model":"minimax-m2\.5"/);
  assert.equal(result.summary.headline, 'AI summary ready');
  assert.equal(result.items[0].titleZh, 'OpenAI agent tools');
});

test('enrichAiDailyItems times out for coding endpoints and lets caller fallback', async (t) => {
  const originalHttpsRequest = https.request;
  let errorHandler = null;

  t.after(() => {
    https.request = originalHttpsRequest;
  });

  https.request = () => ({
    setTimeout(_timeoutMs, handler) {
      setTimeout(() => handler(), 0);
    },
    on(event, handler) {
      if (event === 'error') {
        errorHandler = handler;
      }
    },
    write() {},
    end() {},
    destroy(error) {
      errorHandler?.(error);
    },
  });

  await assert.rejects(
    () =>
      enrichAiDailyItems(buildItems(), {
        apiKey: 'test-key',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/coding',
        model: 'minimax-m2.5',
        date: '2026-03-10',
        requestTimeoutMs: 10,
      }),
    /timed out/i,
  );
});
