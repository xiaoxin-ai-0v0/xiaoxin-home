import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeSearchResults } from '../../scripts/ai-daily/core.mjs';

test('normalizeSearchResults dedupes urls and preserves raw plus processed fields', () => {
  const results = [
    {
      title: 'OpenAI launches new agent tools',
      content: 'A'.repeat(1200),
      url: 'https://example.com/openai-agent-tools',
      source: 'Example',
      published_date: '2026-03-10T02:30:00.000Z'
    },
    {
      title: 'Duplicate item should be removed',
      content: 'duplicate',
      url: 'https://example.com/openai-agent-tools',
      source: 'Example'
    },
    {
      title: 'AI coding startups grow fast',
      content: 'Investors continue to back AI coding tools.',
      url: 'https://example.com/ai-coding-growth',
      source: 'Example'
    }
  ];

  const items = normalizeSearchResults(results, {
    date: '2026-03-10',
    limit: 5,
    processedMap: {
      'https://example.com/openai-agent-tools': {
        titleZh: 'OpenAI 发布新的智能体工具',
        snippetZh: 'OpenAI 发布了一套新的智能体开发工具。',
        contentZh: 'OpenAI 面向智能体开发者推出了新工具集。',
        tags: ['OpenAI', 'Agent']
      }
    }
  });

  assert.equal(items.length, 2);
  assert.equal(items[0].id, '2026-03-10-openai-launches-new-agent-tools');
  assert.equal(items[0].titleZh, 'OpenAI 发布新的智能体工具');
  assert.equal(items[0].tags[0], 'OpenAI');
  assert.equal(items[0].content.length, 1000);
  assert.equal(items[1].titleZh, 'AI coding startups grow fast');
  assert.deepEqual(items[1].tags, []);
});
