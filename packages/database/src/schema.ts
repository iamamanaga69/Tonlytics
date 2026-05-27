import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// 1. SOURCES TABLE
// ==========================================
export const sources = pgTable('sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  url: varchar('url', { length: 512 }).notNull().unique(),
  sourceType: varchar('source_type', { length: 50 }).notNull(), // 'rss' | 'github' | 'telegram' | 'twitter'
  reliabilityScore: integer('reliability_score').default(3).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ==========================================
// 2. RAW UPDATES TABLE
// ==========================================
export const rawUpdates = pgTable('raw_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'cascade' }),
  externalId: varchar('external_id', { length: 255 }),
  sourceUrl: varchar('source_url', { length: 512 }).notNull().unique(),
  rawTitle: text('raw_title').notNull(),
  rawContent: text('raw_content').notNull(),
  publishDate: timestamp('publish_date', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // 'pending' | 'filtered' | 'processed' | 'failed'
  retryCount: integer('retry_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ==========================================
// 3. BRIEFINGS TABLE
// ==========================================
export const briefings = pgTable('briefings', {
  id: uuid('id').primaryKey().defaultRandom(),
  rawUpdateId: uuid('raw_update_id').references(() => rawUpdates.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 512 }).notNull(),
  slug: varchar('slug', { length: 512 }).notNull().unique(),
  briefing: text('briefing').notNull(),
  whyItMatters: text('why_it_matters').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  tags: text('tags').array().default([]).notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  telegramPosted: boolean('telegram_posted').default(false).notNull(),
  telegramMessageId: integer('telegram_message_id'),
  viewsCount: integer('views_count').default(0).notNull(),
  
  // Quality & Evaluation metrics
  confidenceScore: integer('confidence_score').notNull(),
  readabilityScore: integer('readability_score').notNull(),
  hallucinationProbability: integer('hallucination_probability').notNull(),
  sourceQualityScore: integer('source_quality_score').notNull(),
  moderationStatus: varchar('moderation_status', { length: 50 }).default('pending_review').notNull(), // 'auto_approved' | 'pending_review' | 'flagged_discarded'
  
  // Media asset links
  imageUrl: varchar('image_url', { length: 512 }),
  videoUrl: varchar('video_url', { length: 512 }),
  ecosystemContext: text('ecosystem_context'),
  discussionUrl: varchar('discussion_url', { length: 512 }),
  timeline: jsonb('timeline').default([]).notNull(),
  relatedProtocols: jsonb('related_protocols').default([]).notNull(),
  
  // Canonical highlights
  sourceName: varchar('source_name', { length: 255 }),
  sourceUrl: varchar('source_url', { length: 512 }),
  keyTakeaways: text('key_takeaways').array().default([]).notNull(),
  spamProbability: integer('spam_probability').default(0).notNull(),
  duplicateProbability: integer('duplicate_probability').default(0).notNull(),
  relevanceScore: integer('relevance_score').default(0).notNull(),
  
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ==========================================
// 4. MODERATION LOGS TABLE
// ==========================================
export const moderationLogs = pgTable('moderation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  briefingId: uuid('briefing_id').references(() => briefings.id, { onDelete: 'cascade' }).notNull(),
  rawUpdateId: uuid('raw_update_id').references(() => rawUpdates.id, { onDelete: 'set null' }),
  validationErrors: text('validation_errors').array().default([]).notNull(),
  confidenceScore: integer('confidence_score').notNull(),
  actionTaken: varchar('action_taken', { length: 50 }).notNull(), // 'held_for_review' | 'auto_approved' | 'discarded'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ==========================================
// 5. AUTOMATION EXECUTION LOGS TABLE
// ==========================================
export const automationLogs = pgTable('automation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobName: varchar('job_name', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  recordsProcessed: integer('records_processed').default(0).notNull(),
  durationMs: integer('duration_ms').default(0).notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ==========================================
// 6. MEDIA ASSETS TABLE
// ==========================================
export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  briefingId: uuid('briefing_id').references(() => briefings.id, { onDelete: 'cascade' }),
  originalUrl: varchar('original_url', { length: 512 }).notNull(),
  localPath: varchar('local_path', { length: 512 }).notNull(), // e.g. '/uploads/media/brief-uuid.webp'
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ==========================================
// 7. SOURCE TELEMETRY TABLE
// ==========================================
export const sourceTelemetry = pgTable('source_telemetry', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'cascade' }),
  lastCrawledAt: timestamp('last_crawled_at', { withTimezone: true }),
  successCount: integer('success_count').default(0).notNull(),
  failureCount: integer('failure_count').default(0).notNull(),
  staleCount: integer('stale_count').default(0).notNull(), // duplicate/filtered items count
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ==========================================
// 8. REDIRECT TELEMETRY TABLE
// ==========================================
export const redirectTelemetry = pgTable('redirect_telemetry', {
  id: uuid('id').primaryKey().defaultRandom(),
  briefingId: uuid('briefing_id').references(() => briefings.id, { onDelete: 'cascade' }),
  destinationUrl: varchar('destination_url', { length: 512 }).notNull(),
  userAgent: text('user_agent'),
  ipHash: varchar('ip_hash', { length: 64 }),
  referrer: text('referrer'),
  statusCode: integer('status_code').default(302).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ==========================================
// 9. BRIEFING EMBEDDINGS TABLE
// ==========================================
export const briefingEmbeddings = pgTable('briefing_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  briefingId: uuid('briefing_id').references(() => briefings.id, { onDelete: 'cascade' }).notNull(),
  embedding: jsonb('embedding').notNull(), // Array of 1536 floats
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ==========================================
// 10. RELATIONAL LINKS DEFINITIONS
// ==========================================
export const sourcesRelations = relations(sources, ({ many }) => ({
  rawUpdates: many(rawUpdates),
  sourceTelemetry: many(sourceTelemetry)
}));

export const rawUpdatesRelations = relations(rawUpdates, ({ one, many }) => ({
  source: one(sources, {
    fields: [rawUpdates.sourceId],
    references: [sources.id]
  }),
  briefings: many(briefings)
}));

export const briefingsRelations = relations(briefings, ({ one, many }) => ({
  rawUpdate: one(rawUpdates, {
    fields: [briefings.rawUpdateId],
    references: [rawUpdates.id]
  }),
  moderationLogs: many(moderationLogs),
  mediaAssets: many(mediaAssets),
  redirectTelemetry: many(redirectTelemetry),
  briefingEmbeddings: many(briefingEmbeddings)
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  briefing: one(briefings, {
    fields: [mediaAssets.briefingId],
    references: [briefings.id]
  })
}));

export const sourceTelemetryRelations = relations(sourceTelemetry, ({ one }) => ({
  source: one(sources, {
    fields: [sourceTelemetry.sourceId],
    references: [sources.id]
  })
}));

export const redirectTelemetryRelations = relations(redirectTelemetry, ({ one }) => ({
  briefing: one(briefings, {
    fields: [redirectTelemetry.briefingId],
    references: [briefings.id]
  })
}));

export const briefingEmbeddingsRelations = relations(briefingEmbeddings, ({ one }) => ({
  briefing: one(briefings, {
    fields: [briefingEmbeddings.briefingId],
    references: [briefings.id]
  })
}));
