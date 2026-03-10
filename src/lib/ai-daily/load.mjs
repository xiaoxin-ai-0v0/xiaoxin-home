import fs from 'node:fs/promises';
import path from 'node:path';

function resolveDataDir(customDir) {
  return customDir || path.resolve(process.cwd(), 'src/data/ai-daily');
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function getArchiveDates(dataDir) {
  try {
    const manifest = await readJson(path.join(dataDir, 'manifest.json'));
    if (Array.isArray(manifest.dates)) {
      return manifest.dates;
    }
  } catch {
    // ignore missing manifest
  }

  try {
    const archiveDir = path.join(dataDir, 'archive');
    const files = await fs.readdir(archiveDir);
    return files
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, ''))
      .sort((left, right) => right.localeCompare(left));
  } catch {
    const files = await fs.readdir(dataDir);
    return files
      .filter((file) => file.endsWith('.json') && !['latest.json', 'manifest.json'].includes(file))
      .map((file) => file.replace(/\.json$/, '').replace(/^sample-archive$/, '2026-03-10'))
      .sort((left, right) => right.localeCompare(left));
  }
}

export async function loadArchiveByDate(date, options = {}) {
  const dataDir = resolveDataDir(options.dataDir);

  try {
    return await readJson(path.join(dataDir, 'archive', `${date}.json`));
  } catch {
    return await readJson(path.join(dataDir, 'sample-archive.json'));
  }
}

export async function loadLatestDigest(options = {}) {
  const dataDir = resolveDataDir(options.dataDir);

  try {
    return await readJson(path.join(dataDir, 'latest.json'));
  } catch {
    const dates = await getArchiveDates(dataDir);
    if (dates.length === 0) {
      return null;
    }

    return loadArchiveByDate(dates[0], options);
  }
}

export async function loadArchiveIndex(options = {}) {
  const dataDir = resolveDataDir(options.dataDir);
  const dates = await getArchiveDates(dataDir);
  const archives = await Promise.all(dates.map((date) => loadArchiveByDate(date, options)));

  return archives.map((archive) => ({
    date: archive.date,
    generatedAt: archive.generatedAt,
    itemCount: archive.counts?.items || archive.items?.length || 0,
    headline: archive.summary?.headline || '',
  }));
}
