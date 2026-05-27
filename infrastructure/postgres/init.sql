-- Enable pgvector extension for semantic similarity vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. SOURCES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(512) UNIQUE NOT NULL,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('rss', 'github', 'telegram', 'twitter')),
    reliability_score INT NOT NULL DEFAULT 3 CHECK (reliability_score BETWEEN 1 AND 5),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. RAW UPDATES TABLE (Ingested from Crawlers)
-- ==========================================
CREATE TABLE IF NOT EXISTS raw_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    source_url VARCHAR(512) UNIQUE NOT NULL,
    raw_title TEXT NOT NULL,
    raw_content TEXT NOT NULL,
    publish_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filtered', 'processed', 'failed')),
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raw_updates_status ON raw_updates(status);

-- ==========================================
-- 3. BRIEFINGS TABLE (Approved Ecosystem Updates)
-- ==========================================
CREATE TABLE IF NOT EXISTS briefings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_update_id UUID REFERENCES raw_updates(id) ON DELETE SET NULL,
    title VARCHAR(512) NOT NULL,
    slug VARCHAR(512) UNIQUE NOT NULL,
    briefing TEXT NOT NULL,
    why_it_matters TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    telegram_posted BOOLEAN NOT NULL DEFAULT FALSE,
    telegram_message_id INT,
    views_count INT NOT NULL DEFAULT 0,
    
    -- Trust & Quality Metrics
    confidence_score INT NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    readability_score INT NOT NULL CHECK (readability_score BETWEEN 0 AND 100),
    hallucination_probability INT NOT NULL CHECK (hallucination_probability BETWEEN 0 AND 100),
    source_quality_score INT NOT NULL CHECK (source_quality_score BETWEEN 0 AND 100),
    moderation_status VARCHAR(50) NOT NULL DEFAULT 'pending_review' CHECK (moderation_status IN ('auto_approved', 'pending_review', 'flagged_discarded')),
    
    -- Editorial & Asset links (NO synthetic assets)
    image_url VARCHAR(512),
    video_url VARCHAR(512),
    ecosystem_context TEXT,
    discussion_url VARCHAR(512),
    timeline JSONB DEFAULT '[]'::jsonb,
    related_protocols JSONB DEFAULT '[]'::jsonb,
    
    -- Aggregation Canonical Attribution elements
    source_name VARCHAR(255),
    source_url VARCHAR(512),
    key_takeaways TEXT[] DEFAULT '{}',
    spam_probability INT NOT NULL DEFAULT 0,
    duplicate_probability INT NOT NULL DEFAULT 0,
    relevance_score INT NOT NULL DEFAULT 0,
    
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_briefings_category ON briefings(category);
CREATE INDEX IF NOT EXISTS idx_briefings_moderation ON briefings(moderation_status);

-- ==========================================
-- 4. BRIEFING VECTOR EMBEDDINGS (pgvector)
-- ==========================================
CREATE TABLE IF NOT EXISTS briefing_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    briefing_id UUID REFERENCES briefings(id) ON DELETE CASCADE,
    -- 1536 is the standard dimension for OpenAI text-embedding-3-small
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_embeddings_cosine ON briefing_embeddings USING hnsw (embedding vector_cosine_ops);

-- ==========================================
-- 5. MODERATION LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS moderation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    briefing_id UUID REFERENCES briefings(id) ON DELETE CASCADE,
    raw_update_id UUID REFERENCES raw_updates(id) ON DELETE SET NULL,
    validation_errors TEXT[] DEFAULT '{}',
    confidence_score INT NOT NULL,
    action_taken VARCHAR(50) NOT NULL CHECK (action_taken IN ('held_for_review', 'auto_approved', 'discarded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. AUTOMATION SYSTEM LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    records_processed INT NOT NULL DEFAULT 0,
    duration_ms INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. HELPER RPC FUNCTIONS (Views Incrementer)
-- ==========================================
CREATE OR REPLACE FUNCTION increment_views(briefing_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE briefings
    SET views_count = views_count + 1
    WHERE id = briefing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
