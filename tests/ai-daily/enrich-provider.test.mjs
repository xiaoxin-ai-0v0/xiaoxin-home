import test from 'node:test';
import assert from 'node:assert/strict';

import { enrichAiDailyItems } from '../../scripts/ai-daily/providers/openai-compatible.mjs';

test('enrichAiDailyItems uses anthropic coding protocol for api/coding base urls', async (t) => {
  const originalFetch = global.fetch;
  let request = null;

  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async (url, init) => {
    request = { url, init };

    return {
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: {
                headline: 'AI 摘要已生成',
                overview: 'Anthropic 风格接口可正常返回结构化摘要。',
                highlights: ['Coding Plan 通道已适配'],
              },
              items: [
                {
                  url: 'https://example.com/openai-agent-tools',
                  titleZh: 'OpenAI 发布新的智能体工具',
                  snippetZh: 'OpenAI 发布了一套新的智能体开发工具。',
                  contentZh: 'OpenAI 面向智能体开发者推出了新工具集。',
                  tags: ['OpenAI', 'Agent'],
                },
              ],
            }),
          },
        ],
      }),
    };
  };

  const items = [
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

  const result = await enrichAiDailyItems(items, {
    apiKey: 'test-key',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/coding',
    model: 'minimax-m2.5',
    date: '2026-03-10',
  });

  assert.equal(request.url, 'https://ark.cn-beijing.volces.com/api/coding/v1/messages');
  assert.equal(request.init.headers['x-api-key'], 'test-key');
  assert.equal(request.init.headers.Authorization, 'Bearer test-key');
  assert.equal(request.init.headers['anthropic-version'], '2023-06-01');

  const body = JSON.parse(request.init.body);
  assert.equal(body.model, 'minimax-m2.5');
  assert.equal(body.max_tokens, 4000);
  assert.equal(result.summary.headline, 'AI 摘要已生成');
  assert.equal(result.items[0].titleZh, 'OpenAI 发布新的智能体工具');
  assert.deepEqual(result.items[0].tags, ['OpenAI', 'Agent']);
});

test('enrichAiDailyItems times out for coding endpoints and lets caller fallback', async (t) => {
  const originalFetch = global.fetch;

  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () => new Promise(() => {});

  const items = [
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

  await assert.rejects(
    () => enrichAiDailyItems(items, {
      apiKey: 'test-key',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/coding',
      model: 'minimax-m2.5',
      date: '2026-03-10',
      requestTimeoutMs: 10,
    }),
    /timed out/i,
  );
});
