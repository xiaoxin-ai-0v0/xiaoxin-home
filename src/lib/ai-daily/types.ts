export interface AIDailyItem {
  id: string;
  title: string;
  titleZh: string;
  url: string;
  source: string;
  publishedAt: string | null;
  snippetZh: string;
  tags: string[];
}

export interface AIDailySummary {
  headline: string;
  overview: string;
  highlights: string[];
}

export interface AIDailyArchive {
  date: string;
  generatedAt: string;
  topic: string;
  source: {
    search: string;
    enrichment: string;
  };
  counts: {
    items: number;
  };
  summary: AIDailySummary;
  items: AIDailyItem[];
}

export interface AIDailyManifestEntry {
  date: string;
  generatedAt: string;
  itemCount: number;
  headline: string;
}

export interface AIDailyManifest {
  latestDate: string | null;
  dates: string[];
  entries: AIDailyManifestEntry[];
}
