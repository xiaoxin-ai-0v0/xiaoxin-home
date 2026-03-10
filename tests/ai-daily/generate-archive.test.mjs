import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { generateArchive } from '../../scripts/ai-daily/generate.mjs';

test('generateArchive writes archive latest and manifest files', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-daily-'));

  const archive = await generateArchive({
    outputDir: tempDir,
    date: '2026-03-10',
    fetchSearchResults: async () => [
      {
        title: 'OpenAI launches new agent tools',
        content: 'OpenAI introduced a new toolkit for agent builders.',
        url: 'https://example.com/openai-agent-tools',
        source: 'Example'
      }
    ],
    enrichItems: async (items) => ({
      items: items.map((item) => ({
        ...item,
        titleZh: 'OpenAI 发布新的智能体工具',
        snippetZh: 'OpenAI 发布了一套新的智能体开发工具。',
        contentZh: 'OpenAI 面向智能体开发者推出了新工具集。',
        tags: ['OpenAI', 'Agent']
      })),
      summary: {
        headline: 'AI 工具链继续提速。',
        overview: 'OpenAI 的新动作说明 agent 工具链还在快速迭代。',
        highlights: ['Agent tooling is accelerating']
      }
    })
  });

  const archivePath = path.join(tempDir, 'archive', '2026-03-10.json');
  const latestPath = path.join(tempDir, 'latest.json');
  const manifestPath = path.join(tempDir, 'manifest.json');

  const [archiveRaw, latestRaw, manifestRaw] = await Promise.all([
    fs.readFile(archivePath, 'utf8'),
    fs.readFile(latestPath, 'utf8'),
    fs.readFile(manifestPath, 'utf8')
  ]);

  const archiveJson = JSON.parse(archiveRaw);
  const latestJson = JSON.parse(latestRaw);
  const manifestJson = JSON.parse(manifestRaw);

  assert.equal(archive.date, '2026-03-10');
  assert.equal(archiveJson.items[0].titleZh, 'OpenAI 发布新的智能体工具');
  assert.equal(latestJson.date, '2026-03-10');
  assert.deepEqual(manifestJson.dates, ['2026-03-10']);
  assert.equal(manifestJson.latestDate, '2026-03-10');
});
