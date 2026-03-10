import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildFallbackSummary, normalizeSearchResults, sortDatesDescending, toArchiveItems } from './core.mjs';
import { enrichAiDailyItems } from './providers/openai-compatible.mjs';
import { fetchAiNewsFromTavily } from './providers/tavily.mjs';

const DEFAULT_OUTPUT_DIR = fileURLToPath(new URL('../../src/data/ai-daily', import.meta.url));

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function ensureDir(targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
}

async function writeJson(filePath, payload) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function buildManifest(outputDir) {
  const archiveDir = path.join(outputDir, 'archive');
  let archiveFiles = [];

  try {
    archiveFiles = (await fs.readdir(archiveDir)).filter((file) => file.endsWith('.json'));
  } catch {
    archiveFiles = [];
  }

  const dates = sortDatesDescending(archiveFiles.map((file) => file.replace(/\.json$/, '')));
  const entries = [];

  for (const date of dates) {
    const archive = await readJsonIfExists(path.join(archiveDir, `${date}.json`));
    if (!archive) {
      continue;
    }

    entries.push({
      date,
      generatedAt: archive.generatedAt,
      itemCount: archive.counts?.items || archive.items?.length || 0,
      headline: archive.summary?.headline || '',
    });
  }

  return {
    latestDate: dates[0] || null,
    dates,
    entries,
  };
}

export async function generateArchive(options = {}) {
  const {
    outputDir = DEFAULT_OUTPUT_DIR,
    date = getTodayDate(),
    limit = 8,
    fetchSearchResults = fetchAiNewsFromTavily,
    enrichItems = enrichAiDailyItems,
  } = options;

  const rawResults = await fetchSearchResults({ date, limit });
  const normalizedItems = normalizeSearchResults(rawResults, { date, limit });
  let enrichment;

  try {
    enrichment = await enrichItems(normalizedItems, { date });
  } catch (error) {
    console.warn(`AI enrichment skipped: ${error.message}`);
    enrichment = {
      items: normalizedItems,
      summary: buildFallbackSummary({ date, items: normalizedItems }),
      provider: 'fallback',
    };
  }

  const enrichedItems = Array.isArray(enrichment.items) ? enrichment.items : normalizedItems;
  const items = toArchiveItems(enrichedItems);
  const summary = enrichment.summary || buildFallbackSummary({ date, items: enrichedItems });

  const archive = {
    date,
    generatedAt: new Date().toISOString(),
    topic: 'ai',
    source: {
      search: fetchSearchResults === fetchAiNewsFromTavily ? 'tavily' : 'custom',
      enrichment: enrichment.provider || 'fallback',
    },
    counts: {
      items: items.length,
    },
    summary,
    items,
  };

  await writeJson(path.join(outputDir, 'archive', `${date}.json`), archive);
  await writeJson(path.join(outputDir, 'latest.json'), archive);
  await writeJson(path.join(outputDir, 'manifest.json'), await buildManifest(outputDir));

  return archive;
}

async function main() {
  const dateArgument = process.argv.find((value) => value.startsWith('--date='));
  const date = dateArgument ? dateArgument.replace('--date=', '') : getTodayDate();
  const archive = await generateArchive({ date });
  console.log(`Generated AI daily archive for ${archive.date} with ${archive.counts.items} items.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
