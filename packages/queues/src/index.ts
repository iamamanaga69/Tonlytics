import { Queue, ConnectionOptions, JobsOptions } from 'bullmq';
import Redis from 'ioredis';

// Standard Redis Connection Configuration for background workers
export const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redisConnection: Redis | null = null;

/**
 * Get or create a shared Redis connection pool for BullMQ queues/workers.
 */
export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null // Required by BullMQ
    });
    
    redisConnection.on('error', (err) => {
      console.error('[REDIS] Connection error:', err);
    });
  }
  return redisConnection;
}

// ==========================================
// QUEUE DEFINITIONS
// ==========================================
export const QUEUE_NAMES = {
  INGESTION: 'ingestion-queue',
  EXTRACTION: 'extraction-queue',
  MEDIA: 'media-queue',
  AI_ENRICHMENT: 'ai-enrichment-queue',
  SEMANTIC_SCORING: 'semantic-scoring-queue',
  DUPLICATE_DETECTION: 'duplicate-queue',
  SEARCH: 'search-queue',
  MODERATION: 'moderation-queue',
  CLEANUP: 'cleanup-queue',
  TELEMETRY: 'telemetry-queue',
  TELEGRAM: 'telegram-queue'
} as const;

// Standard retry policies and options
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 5000 // 5s, 10s, 20s...
  },
  removeOnComplete: { age: 24 * 3600 }, // Clean up completed jobs after 24h
  removeOnFail: { age: 7 * 24 * 3600 }   // Keep failed jobs in DLQ for 7 days
};

// Queue Instances (Singleton map)
const queues: Record<string, Queue> = {};

/**
 * Get or initialize a named BullMQ queue.
 */
export function getQueue(queueName: keyof typeof QUEUE_NAMES | string): Queue {
  const name = queueName in QUEUE_NAMES
    ? (QUEUE_NAMES as Record<string, string>)[queueName]
    : queueName;
  
  if (!queues[name]) {
    queues[name] = new Queue(name, {
      connection: getRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS
    });
  }
  
  return queues[name];
}

// ==========================================
// JOB PAYLOAD INTERFACES
// ==========================================
export interface IngestionJobPayload {
  sourceId: string;
  sourceUrl: string;
  sourceType: 'rss' | 'github' | 'telegram' | 'twitter';
  forceRefresh?: boolean;
}

export interface ExtractionJobPayload {
  rawUpdateId: string;
  sourceUrl: string;
}

export interface MediaJobPayload {
  briefingId: string;
  imageUrl?: string;
  sourceUrl: string;
}

export interface AIEnrichmentJobPayload {
  rawUpdateId: string;
  rawTitle: string;
  rawContent: string;
  sourceUrl: string;
  sourceName: string;
  reliabilityScore: number;
}

export interface SemanticScoringJobPayload {
  briefingId: string;
  rawContent: string;
  title: string;
}

export interface DuplicateDetectionJobPayload {
  rawUpdateId: string;
  rawContent: string;
}

export interface SearchJobPayload {
  briefingId: string;
  action: 'index' | 'delete';
}

export interface ModerationJobPayload {
  briefingId: string;
  confidenceScore: number;
}

export interface CleanupJobPayload {
  action: 'daily_prune' | 'temp_clear';
}

export interface TelemetryJobPayload {
  eventName: string;
  metadata: any;
}

export interface TelegramJobPayload {
  briefingId: string;
  text: string;
}
