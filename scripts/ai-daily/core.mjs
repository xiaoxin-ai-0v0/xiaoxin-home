const MAX_SNIPPET_LENGTH = 120;

function cleanText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function truncateText(value, maxLength) {
  const cleaned = cleanText(value);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return cleaned.slice(0, maxLength).trim();
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function getUrlKey(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function getSourceName(item) {
  if (item.source) {
    return cleanText(item.source);
  }

  try {
    const hostname = new URL(item.url).hostname.replace(/^www\./, '');
    const root = hostname.split('.')[0] || 'Web';
    return root.charAt(0).toUpperCase() + root.slice(1);
  } catch {
    return 'Web';
  }
}

export function normalizeSearchResults(results, options = {}) {
  const { date, limit = 8, processedMap = {} } = options;
  const items = [];
  const usedUrls = new Set();

  for (const result of results) {
    if (items.length >= limit) {
      break;
    }

    const title = cleanText(result.title);
    const url = getUrlKey(result.url);

    if (!title || !url || usedUrls.has(url)) {
      continue;
    }

    usedUrls.add(url);

    const processed = processedMap[url] || {};
    const snippet = truncateText(
      result.summary || result.content || result.raw_content || result.rawContent || '',
      MAX_SNIPPET_LENGTH,
    );
    const idBase = slugify(title) || `item-${items.length + 1}`;

    items.push({
      id: `${date}-${idBase}`,
      title,
      titleZh: cleanText(processed.titleZh || title),
      url,
      source: getSourceName(result),
      publishedAt: result.published_date || result.publishedAt || `${date}T00:00:00.000Z`,
      snippet,
      snippetZh: cleanText(processed.snippetZh || snippet),
      tags: Array.isArray(processed.tags) ? processed.tags.filter(Boolean).slice(0, 5) : [],
    });
  }

  return items;
}

export function toArchiveItems(items) {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    titleZh: item.titleZh || item.title,
    url: item.url,
    source: item.source,
    publishedAt: item.publishedAt || null,
    snippetZh: item.snippetZh || item.snippet || '',
    tags: Array.isArray(item.tags) ? item.tags.filter(Boolean).slice(0, 5) : [],
  }));
}

export function buildFallbackSummary({ date, items }) {
  const titles = items.slice(0, 3).map((item) => item.titleZh || item.title);

  return {
    headline: items.length > 0 ? `已沉淀 ${items.length} 条 AI 资讯` : `${date} 暂无可用 AI 资讯`,
    overview: items.length > 0
      ? `这份 AI 观察归档收录了 ${items.length} 条真实资讯，方便后续复盘、搜索与再加工。`
      : '当天未生成有效资讯条目，保留空归档以维持时间连续性。',
    highlights: titles.length > 0 ? titles : ['等待下一次数据生成'],
  };
}

export function sortDatesDescending(dates) {
  return [...dates].sort((left, right) => right.localeCompare(left));
}
