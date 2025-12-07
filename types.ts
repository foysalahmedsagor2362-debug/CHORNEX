export type Language = 'en' | 'bn';

export interface NewsHighlight {
  headline: string;
  summary: string;
  url?: string;
  category: 'world' | 'economy' | 'tech' | 'security' | 'climate' | 'politics' | 'bangladesh' | 'other';
  timestamp: string;
}

export interface NewsResponse {
  generated_at: string;
  language: Language;
  status: 'OK' | 'NO NEW UPDATE';
  highlights: NewsHighlight[];
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface AppState {
  data: NewsResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  sources: GroundingSource[];
}