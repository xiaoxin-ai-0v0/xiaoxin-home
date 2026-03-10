import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { generateArchive } from '../../scripts/ai-daily/generate.mjs';

test('generateArchive writes slim archive latest and manifest files', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-daily-'));

  const archive = await generateArchive({
    outputDir: tempDir,
    date: '2026-03-10',
    fetchSearchResults: async () => [
      {
        title: 'OpenAI launches new agent tools',
        content: 'OpenAI introduced a new toolkit for agent builders.',
        url: 'https://example.com/openai-agent-tools',
        source: 'Example',
      },
    ],
    enrichItems: async (items) => ({
      items: items.map((item) => ({
        ...item,
        titleZh: 'OpenAI new agent tools',
        snippetZh: 'OpenAI released a new toolkit for agent builders.',
        tags: ['OpenAI', 'Agent'],
      })),
      summary: {
        headline: 'Agent tooling keeps accelerating',
        overview: 'OpenAI continues to expand tooling for agent builders.',
        highlights: ['Agent tooling is accelerating'],
      },
    }),
  });

  const archivePath = path.join(tempDir, 'archive', '2026-03-10.json');
  const latestPath = path.join(tempDir, 'latest.json');
  const manifestPath = path.join(tempDir, 'manifest.json');

  const [archiveRaw, latestRaw, manifestRaw] = await Promise.all([
    fs.readFile(archivePath, 'utf8'),
    fs.readFile(latestPath, 'utf8'),
    fs.readFile(manifestPath, 'utf8'),
  ]);

  const archiveJson = JSON.parse(archiveRaw);
  const latestJson = JSON.parse(latestRaw);
  const manifestJson = JSON.parse(manifestRaw);

  assert.equal(archive.date, '2026-03-10');
  assert.equal(archiveJson.items[0].titleZh, 'OpenAI new agent tools');
  assert.equal(archiveJson.items[0].snippetZh, 'OpenAI released a new toolkit for agent builders.');
  assert.ok(!('snippet' in archiveJson.items[0]));
  assert.ok(!('content' in archiveJson.items[0]));
  assert.ok(!('contentZh' in archiveJson.items[0]));
  assert.equal(latestJson.date, '2026-03-10');
  assert.deepEqual(manifestJson.dates, ['2026-03-10']);
  assert.equal(manifestJson.latestDate, '2026-03-10');
});
