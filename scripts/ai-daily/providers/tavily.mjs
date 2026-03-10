const AI_SEARCH_QUERIES = [
  'AI artificial intelligence news today',
  'OpenAI Anthropic Google AI latest news',
  'AI agents coding tools model releases latest',
];

function getDateRange(date) {
  const end = new Date(`${date}T00:00:00.000Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 1);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

async function searchOnce({ apiKey, query, date, maxResults }) {
  const { startDate, endDate } = getDateRange(date);
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      topic: 'news',
      include_answers: 'advanced',
      search_depth: 'advanced',
      max_results: maxResults,
      start_date: startDate,
      end_date: endDate,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavily search failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return Array.isArray(payload.results) ? payload.results : [];
}

export async function fetchAiNewsFromTavily(options = {}) {
  const {
    apiKey = process.env.TAVILY_API_KEY,
    date,
    limit = 8,
    queries = AI_SEARCH_QUERIES,
  } = options;

  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is required to fetch AI news');
  }

  const perQuery = Math.max(3, Math.ceil(limit / queries.length) + 1);
  const merged = [];
  const seen = new Set();

  for (const query of queries) {
    const results = await searchOnce({ apiKey, query, date, maxResults: perQuery });

    for (const result of results) {
      if (!result.url || seen.has(result.url)) {
        continue;
      }

      seen.add(result.url);
      merged.push(result);

      if (merged.length >= limit * 2) {
        break;
      }
    }

    if (merged.length >= limit * 2) {
      break;
    }
  }

  return merged;
}
