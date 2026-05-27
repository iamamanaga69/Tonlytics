import { z } from 'zod';

// ==========================================
// 1. ZOD ENVIRONMENT SCHEMAS
// ==========================================
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).default('3005'),
  
  // Database bindings
  DATABASE_URL: z.string().optional(), // Used by Drizzle ORM
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().or(z.literal('')),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().or(z.literal('')),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Background Job Queues
  REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),
  
  // High-Speed Typo Tolerant Search
  MEILISEARCH_HOST: z.string().url().default('http://127.0.0.1:7700'),
  MEILISEARCH_API_KEY: z.string().default('masterKey'),
  
  // Observability & Error reporting
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // LLM AI integrations
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  COINGECKO_API_KEY: z.string().optional(),
  TONCENTER_API_KEY: z.string().optional(),
  TONAPI_KEY: z.string().optional(),
  ADMIN_ALLOWED_EMAILS: z.string().optional(),
  
  // Crawler security
  CRON_SECRET: z.string().default('dev_secret_token')
});

// Parse process environment
let parsedEnv: z.infer<typeof envSchema>;

try {
  parsedEnv = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    REDIS_URL: process.env.REDIS_URL,
    MEILISEARCH_HOST: process.env.MEILISEARCH_HOST,
    MEILISEARCH_API_KEY: process.env.MEILISEARCH_API_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    LOG_LEVEL: process.env.LOG_LEVEL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
    TONCENTER_API_KEY: process.env.TONCENTER_API_KEY,
    TONAPI_KEY: process.env.TONAPI_KEY,
    ADMIN_ALLOWED_EMAILS: process.env.ADMIN_ALLOWED_EMAILS,
    CRON_SECRET: process.env.CRON_SECRET
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingKeys = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
    console.error('❌ [CONFIG] Environment variables validation failed:\n', missingKeys);
  } else {
    console.error('❌ [CONFIG] Failed to parse environment variables:', error);
  }
  
  // In development/test, fallback to default safe metrics rather than forcing crash
  parsedEnv = envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  });
}

export const env = parsedEnv;

// ==========================================
// 2. RUNTIME SYSTEM CONFIGURATION & VERIFICATIONS
// ==========================================
export interface SourceSeed {
  name: string;
  url: string;
  source_type: 'rss' | 'github' | 'telegram' | 'twitter';
  reliability_score: number;
}

export const VERIFIED_SOURCES: SourceSeed[] = [
  {
    name: 'TON Foundation Blog',
    url: 'https://ton.org/en/blog/rss',
    source_type: 'rss',
    reliability_score: 5
  },
  {
    name: 'TON Core Releases',
    url: 'https://github.com/ton-blockchain/ton/releases',
    source_type: 'github',
    reliability_score: 5
  },
  {
    name: 'Telegram Apps SDK Updates',
    url: 'https://github.com/telegram-apps/sdk/releases',
    source_type: 'github',
    reliability_score: 5
  },
  {
    name: 'TON Keeper Announcements',
    url: 'https://t.me/s/tonkeeper',
    source_type: 'telegram',
    reliability_score: 4
  },
  {
    name: 'STON.fi Announcements',
    url: 'https://t.me/s/stonfichannel',
    source_type: 'telegram',
    reliability_score: 4
  },
  {
    name: 'TON Community',
    url: 'https://t.me/s/toncoin',
    source_type: 'telegram',
    reliability_score: 5
  },
  {
    name: 'TON Society',
    url: 'https://t.me/s/tonsociety',
    source_type: 'telegram',
    reliability_score: 4
  },
  {
    name: 'Fragment Updates',
    url: 'https://t.me/s/fragment',
    source_type: 'telegram',
    reliability_score: 4
  },
  {
    name: 'MyTonWallet',
    url: 'https://t.me/s/mytonwallet_en',
    source_type: 'telegram',
    reliability_score: 4
  },
  {
    name: 'DeDust Announcements',
    url: 'https://t.me/s/dedust',
    source_type: 'telegram',
    reliability_score: 4
  }
];

export const TRUST_THRESHOLDS = {
  AUTO_APPROVE_CONFIDENCE: 90,   // Confidence score >= 90 is auto-published
  DISCARD_SPAM_PROBABILITY: 85,  // Spam score >= 85 is discarded immediately
  DISCARD_DUPLICATE_PROBABILITY: 90, // Duplicate score >= 90 is merged/discarded
  RELEVANCE_SCORE_MINIMUM: 70   // Relevance score must be >= 70 to be considered
};

export const SYSTEM_TIMEOUTS = {
  CRAWLER_HTTP_TIMEOUT_MS: 30000, // 30 seconds
  LLM_CALL_TIMEOUT_MS: 45000     // 45 seconds
};

export const APP_INFO = {
  name: 'Tonlytics',
  tagline: 'TON Ecosystem Intelligence Engine',
  version: '1.0.0'
};
