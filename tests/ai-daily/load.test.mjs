import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadArchiveIndex,
  loadLatestDigest,
  loadArchiveByDate,
  loadArchiveTimeline,
} from '../../src/lib/ai-daily/load.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, 'fixtures');

test('loaders expose latest digest and sorted archive metadata', async () => {
  const latest = await loadLatestDigest({ dataDir: fixtureDir });
  const archive = await loadArchiveByDate('2026-03-10', { dataDir: fixtureDir });
  const index = await loadArchiveIndex({ dataDir: fixtureDir });

  assert.equal(latest.date, '2026-03-10');
  assert.equal(archive.items.length, 2);
  assert.equal(index.length, 1);
  assert.equal(index[0].date, '2026-03-10');
  assert.equal(index[0].itemCount, 2);
});

test('loadArchiveTimeline groups entries by year and month', async () => {
  const timeline = await loadArchiveTimeline({ dataDir: fixtureDir });

  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].year, '2026');
  assert.equal(timeline[0].month, '03');
  assert.equal(timeline[0].entries.length, 1);
  assert.equal(timeline[0].entries[0].date, '2026-03-10');
});
