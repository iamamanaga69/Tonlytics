export type BriefingCategory = 'Ecosystem' | 'Infrastructure' | 'Mini Apps' | 'DeFi' | 'Integration';

export type ModerationStatus = 'auto_approved' | 'pending_review' | 'flagged_discarded';

export interface Source {
  id: string;
  name: string;
  url: string;
  source_type: 'rss' | 'github' | 'telegram' | 'twitter';
  reliability_score: number; // 1-5 scale
  is_active: boolean;
  created_at: string;
}

export interface RawUpdate {
  id: string;
  source_id: string;
  external_id?: string;
  source_url: string;
  raw_title: string;
  raw_content: string;
  publish_date: string;
  status: 'pending' | 'filtered' | 'processed' | 'failed';
  retry_count: number;
  created_at: string;
}

export interface Briefing {
  id: string;
  raw_update_id?: string;
  title: string;
  slug: string;
  briefing: string;
  why_it_matters: string;
  category: BriefingCategory;
  tags: string[];
  is_published: boolean;
  telegram_posted: boolean;
  telegram_message_id?: number;
  views_count: number;
  
  // Moderation & Trust Metrics
  confidence_score: number;        // 0-100 score
  readability_score: number;       // 0-100 score
  hallucination_probability: number; // 0-100 score
  source_quality_score: number;     // 0-100 score
  moderation_status: ModerationStatus;
  
  // Rich Editorial & Ecosystem Media elements
  image_url?: string;
  video_url?: string;
  ecosystem_context?: string;
  discussion_url?: string;
  timeline?: { date: string; title: string; description: string }[];
  related_protocols?: { name: string; category: string; url: string }[];
  
  // Production Aggregation & Canonical Attribution Elements
  source_name?: string;
  source_url?: string;
  key_takeaways?: string[];
  spam_probability?: number;
  duplicate_probability?: number;
  relevance_score?: number;
  
  published_at: string;
  created_at: string;
}

export interface ModerationLog {
  id: string;
  briefing_id: string;
  raw_update_id?: string;
  validation_errors: string[];
  confidence_score: number;
  action_taken: 'held_for_review' | 'auto_approved' | 'discarded';
  created_at: string;
}

export interface AutomationLog {
  id: string;
  job_name: string;
  status: string;
  records_processed: number;
  duration_ms: number;
  error_message?: string | null;
  created_at: string;
}

export interface IngestionSourceConfig {
  name: string;
  url: string;
  source_type: Source['source_type'];
  reliability_score: number;
}

export interface MediaAsset {
  id: string;
  briefing_id?: string;
  original_url: string;
  local_path: string;
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  created_at: string;
}

export interface SourceTelemetry {
  id: string;
  source_id?: string;
  last_crawled_at?: string;
  success_count: number;
  failure_count: number;
  stale_count: number;
  error_message?: string;
  created_at: string;
}

export interface RedirectTelemetry {
  id: string;
  briefing_id?: string;
  destination_url: string;
  user_agent?: string;
  ip_hash?: string;
  referrer?: string;
  status_code: number;
  created_at: string;
}

export interface BriefingEmbedding {
  id: string;
  briefing_id: string;
  embedding: number[];
  created_at: string;
}

export interface News {
  id: string;
  title: string;
  content?: string;
  source_url?: string;
  published_at?: string;
  created_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  author?: string;
  published_at?: string;
  created_at: string;
}

export interface EcosystemUpdate {
  id: string;
  title: string;
  description?: string;
  category?: string;
  project_url?: string;
  created_at: string;
}

export interface MarketData {
  id: string;
  price_usd: number;
  volume_24h?: number;
  market_cap?: number;
  change_24h?: number;
  last_updated: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  address: string;
  network?: string;
  public_key?: string;
  connected_at: string;
}

export interface User {
  id: string;
  email?: string;
  wallet_address?: string;
  created_at: string;
}

export interface TrendingTopic {
  id: string;
  topic: string;
  mention_count: number;
  last_seen_at: string;
}

export interface FeedCache {
  id: string;
  key: string;
  data: any;
  expires_at: string;
  updated_at: string;
}

