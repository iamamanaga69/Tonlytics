# Tonlytics Developer Guide for Codex

Welcome to **Tonlytics**! This document serves as the main engineering orientation handbook for Codex (or any AI coding assistant) working on the Next.js frontend, Python monitor pipeline, and Supabase integration.

---

## 1. Project Stack & Architecture Overview

Tonlytics is a monorepo structured with **npm workspaces**:

```
tonlytics/
├── apps/
│   ├── web/               # Next.js 16 (Turbopack) Web Presentation Client
│   └── telegram-monitor/  # Python / Telethon Telegram Crawler & API Server
│
├── packages/              # Shared Monorepo Packages
│   ├── database/          # Drizzle ORM PostgreSQL connections and query schemas
│   ├── types/             # Common TypeScript interfaces
│   └── config/            # Environment variable schemas
│
├── scripts/               # SQL Migrations and Bootstrapping scripts
└── CODEX.md               # This Developer Orientation Guide
```

---

## 2. Design System & Editorial Visual Invariants

The presentation tier has been styled as a **premium, asymmetric editorial publication** (an "independent TON intelligence studio"). 

### A. Typography
Never use browser defaults or standard Tailwind fonts. Always apply these custom class utilities:
*   **Headlines & Editorial Titles**: `.serif-title` (Font family: `Fraunces` / serif).
*   **Body & Reading Text**: `.sans-body` (Font family: `Inter` / sans-serif).
*   **Metadata, Tags, Telemetry**: `.mono-label` (Font family: `JetBrains Mono` / monospace).

### B. Color System (Light & Dark Theme Variables)
Do **NOT** hardcode hex colors (e.g., `bg-[#0b0f19]`, `border-slate-800`). Use theme-adaptable CSS variables defined in [globals.css](file:///C:/Users/Agarw/.gemini/antigravity/scratch/tonlytics/apps/web/src/app/globals.css):

| CSS Variable Class | Light Mode (`html`) | Dark Mode (`html.dark`) |
|---|---|---|
| `bg-editorial-bg` | Warm Alabaster (`#fcfbfa`) | Deep Obsidian Navy (`#0b0f19`) |
| `bg-editorial-card` | Pure White (`#ffffff`) | Slate Surface (`#111827`) |
| `text-foreground` | Graphite Stone (`#1c1917`) | Off-White Slate (`#f8fafc`) |
| `text-editorial-text-subtle` | Stone Secondary (`#57534e`) | Slate Muted (`#94a3b8`) |
| `border-editorial-border` | Stone Hairline (`#e7e5e4`) | Slate Hairline (`#1f2937`) |
| `border-editorial-border-hover` | Stone Accent (`#a8a29e`) | Slate Accent (`#4b5563`) |
| `bg-editorial-accent` | TON Sky Blue (`#0369a1`) | TON Luminous Sky (`#38bdf8`) |

### C. Aesthetic Guidelines
*   **Sharp Borders**: Card components (`BriefingCard`) use flat, sharp borders, **not** generic rounded bubbles (`rounded-2xl`).
*   **Zero Neon Glow**: Avoid glowing grid indicators, neon gradient text, and hacker terminal console aesthetics.
*   **Asymmetric Compositions**: Break layout grids. Use different visual heights, text-bullet quick feeds, and offset sidebars.

---

## 3. Database Schema & Access Rules

Supabase houses the PostgreSQL database. There are 9 tables:
1.  `sources`: Crawled seed nodes.
2.  `raw_updates`: Incoming unprocessed announcement entries.
3.  `briefings`: Main enriched, published news reports.
4.  `moderation_logs`: Curation logs.
5.  `automation_logs`: Execution audit records.
6.  `media_assets`: Optimized image attachment trackers.
7.  `source_telemetry`: Crawler diagnostics.
8.  `redirect_telemetry`: Click/read routing trackers.
9.  `briefing_embeddings`: Fact vectors.

### Critical Security Rules:
*   **Client Queries**: The browser queries Supabase using the public Anon Key via `supabase` client in [supabase-client.ts](file:///C:/Users/Agarw/.gemini/antigravity/scratch/tonlytics/apps/web/src/lib/supabase-client.ts). RLS policies/grants govern these calls.
*   **Server Actions**: Backend jobs and API endpoints (such as `/api/ingest`) query via `supabaseAdmin` utilizing the secret `SUPABASE_SERVICE_ROLE_KEY`. **NEVER** expose this service key to client-side code.
*   **Database Grants**: Database roles require table-level grants. Apply [grant_permissions.sql](file:///C:/Users/Agarw/.gemini/antigravity/scratch/tonlytics/scripts/grant_permissions.sql) in the Supabase SQL editor to authorize role transactions.

---

## 4. Real-Time Sync Loop

Tonlytics uses an active polling and push loop:

1.  **Telegram monitor** (`apps/telegram-monitor/`) crawls whitelisted channels, downloading photos locally and appending entries to `data/messages.json`.
2.  **Sync Bridge** (`apps/telegram-monitor/src/bridge.py`) checks `messages.json` every 60 seconds, POSTing raw news to Next.js `/api/ingest`.
3.  **Next.js API Ingest** (`apps/web/src/app/api/ingest/route.ts`) checks security, performs AI-style parsing, filters duplicates, and inserts the briefing into the `briefings` table in Supabase.
4.  **Supabase Realtime** triggers client updates. The `useBriefings` hook in the browser captures these database-level inserts immediately, updating the UI stream without reload.

---

## 5. Codex Build commands

When executing tests or modifications:

```bash
# Verify TypeScript safety and Turbopack workspace builds
npm run build --workspace=web

# Check running background processes
# Port 3000: Next.js dev server
# Port 3010: Telegram Monitor API
```
