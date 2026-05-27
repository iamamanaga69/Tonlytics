# Tonlytics — Automated TON Ecosystem Intelligence Platform

Tonlytics is a production-grade, 24/7 automated ecosystem intelligence, curation, and discovery platform for the TON (The Open Network) blockchain.

It leverages a queue-first monorepo architecture built with **Node.js, TypeScript, PostgreSQL (via Drizzle ORM), Redis, and BullMQ** to crawl announcements, calculate semantic duplicate scores, optimize media assets, and publish high-signal briefings.

---

## 1. Monorepo Directory Architecture

The repository is structured as an npm workspaces monorepo:

```
tonlytics/
├── apps/                         # RUNTIME APPLICATIONS
│   ├── web/                      # Next.js 16 Presentation client (dynamic /briefing/[slug] routes)
│   ├── api/                      # REST API Endpoint server
│   ├── ingestion/                # Playwright & Cheerio crawler playbooks
│   ├── worker/                   # BullMQ background task workers
│   ├── scheduler/                # Ingestion & Cleanup cron schedulers
│   └── moderation/               # Curation editorial publishing tools
│
├── packages/                     # SHARED DOMAIN PACKAGES
│   ├── config/                   # Zod environment schemas & whitelists
│   ├── ai/                       # OpenAI & Gemini factual summarization prompt models
│   ├── database/                 # Drizzle ORM PostgreSQL connection pools & schemas
│   ├── cache/                    # Redis client connectors
│   ├── queues/                   # BullMQ queues, repeat setups & job types
│   ├── extraction/               # Cheerio, RSS, and OpenGraph metadata crawlers
│   ├── telemetry/                # Pino structured JSON observability loggers
│   ├── embeddings/               # Text embeddings vector similarities
│   ├── media/                    # Sharp image compressions & CORS verifications
│   ├── shared/                   # Global helpers (slugify, dates, formats)
│   └── types/                    # Common interface types
│
└── docs/                         # IMPLEMENTATION ARCHITECTURE DETAILS
```

---

## 2. Ingestion-to-Publishing Stages (24-Step Pipeline)

Every announcement passes through this decoupled processing chain before publication:

1. **Source Discovery:** Scrapes new posts from whitelisted seeds.
2. **Duplicate Detection:** Performs cosine similarity embeddings against recent briefings to filter redundancies.
3. **Body Extraction:** Crawls URLs to extract readable text blocks.
4. **AI Summarization:** Invokes OpenAI/Gemini to build factual summaries, tags, and takeaways.
5. **Relevance Scoring:** Computes trust ratings and categories, noise filter checks (relevance must be $\ge 70\%$).
6. **Media Optimization:** Downloads external images locally, resizes and converts them to optimized WebP formats using Sharp, saving them to `apps/web/public/uploads/media/` to avoid CORS hotlinking blocks.
7. **Moderation Gates:** Auto-approves high-confidence signals ($\ge 90\%$) or redirects to curation review.
8. **Search Indexing:** Syncs entries directly to Meilisearch.

---

## 3. Dedicated Background Workers (10 Worker Scopes)

Async queues are decoupled inside `apps/worker/src/index.ts` governed by BullMQ:

* **`source-ingestion-worker` (`ingestion-queue`):** Triggers crawling cycles across whitelisted seeds.
* **`duplicate-detection-worker` (`duplicate-queue`):** Analyzes vector thresholds to filter out redundant briefings.
* **`extraction-worker` (`extraction-queue`):** Extracts metadata fields, raw titles, and body texts from articles.
* **`ai-enrichment-worker` (`ai-enrichment-queue`):** Requests LLM summarization frames.
* **`semantic-scoring-worker` (`semantic-scoring-queue`):** Scores category mappings and relevance weights.
* **`media-worker` (`media-queue`):** Triggers the Local Sharp Download & Compression pipeline.
* **`moderation-worker` (`moderation-queue`):** Records approval states and curation overrides.
* **`indexing-worker` (`search-queue`):** Updates Meilisearch indexes.
* **`telemetry-worker` (`telemetry-queue`):** Logs lag states and alerts on Dead-Letter Queue failures.
* **`cleanup-worker` (`cleanup-queue`):** Triggers nightly sweeps, pruning temporary directories.

---

## 4. Local Media Optimization Pipeline

External images are fully validated and optimized locally:
1. `normalizeMediaUrl` standardises protocols (e.g. prepending `https:` to relative paths).
2. `verifyImageAccessibility` runs a rapid HTTP `HEAD` request (falling back to a range-sliced `GET` block if `405` is returned).
3. `downloadAndOptimizeMedia` fetches the image, compresses it to WebP natively via Sharp (falling back to raw write if sharp is unavailable), and saves it to `apps/web/public/uploads/media/brief-{briefingId}.webp`.
4. Saves records inside the `media_assets` database schema to eliminate external hotlinking CORS failures.

---

## 5. Development and Startup Guide

### Prerequisites
* **Node.js:** v18+ (tested on v20/v22)
* **Redis:** active instance (needed for BullMQ queues)
* **PostgreSQL:** active instance (or Supabase credentials)

### Environment Settings
Create a `.env.local` at the root:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/tonlytics
REDIS_URL=redis://127.0.0.1:6379

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_role_key

OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key

MEILISEARCH_HOST=http://127.0.0.1:7700
MEILISEARCH_API_KEY=masterKey
```

### Installation & Builds
```bash
# 1. Install dependencies across workspaces
npm install

# 2. Build shared packages and apps
npm run build
```

### Process Management
Run workers, schedulers, and frontends concurrently:
```bash
# Start background queue workers
npm run worker:dev

# Start cron job schedulers
npm run scheduler:dev

# Start Next.js Web Presentation terminal
npm run web:dev
```

---

## 6. 🦾 AI Resume & Pair-Programming Handbook

If you are a coding assistant (like **Claude, Codex, or GPT-4**) resuming this project, here is the absolute developer blueprint to help you continue without context drift:

### A. Core Architecture Invariants
* **Strict Type Safety:** All database schema operations are typed using Drizzle. Do NOT use loose parameters.
* **Clean Separation of Concerns:** Ingestion playbooks and crawling scrapers live strictly in `apps/ingestion` and `@tonlytics/extraction`. Next.js API routes under `apps/web/src/app/api/` function purely as lightweight trigger/moderation controllers that add jobs to BullMQ queues.
* **No Console Logs:** Strictly import `@tonlytics/telemetry` loggers (`logInfo`, `logWarn`, `logError`) which run under Pino.
* **Typographic Fallbacks:** If an image fails the media worker or HEAD check, `ImageWithFallback.tsx` will return `null`, collapsing the UI gracefully into a premium, typography-only editorial layout card.
* **Redirect Isolation:** Outbound link transitions *must* route exclusively through the secure, server-validated `/api/redirect` gate (`/api/redirect?id={briefingId}`), fully tracking referrers and auditing clicks.

### B. Common File References
* Database schemas: `packages/database/src/schema.ts`
* Ingestion pipelines: `apps/worker/src/index.ts`
* Image optimizations: `packages/media/src/index.ts`
* Safe redirection logic: `apps/web/src/app/api/redirect/route.ts`
* Reusable fallback component: `apps/web/src/components/terminal/ImageWithFallback.tsx`
* Feed Spotlight Hero card: `apps/web/src/components/terminal/BriefingFeed.tsx`
