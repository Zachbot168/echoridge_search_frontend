-- EchoRidge Search Universal Catalog Schema
-- Global tables (read-only from API)

-- Companies table with deterministic scoring
CREATE TABLE IF NOT EXISTS companies (
    global_company_id TEXT PRIMARY KEY,
    dataset_version TEXT NOT NULL,
    name TEXT NOT NULL,
    domain TEXT,
    postal_code TEXT,
    country_code TEXT,
    city TEXT,
    state TEXT,
    region TEXT,
    industry TEXT,
    sector TEXT,
    employee_count INTEGER,
    revenue_estimate REAL,
    -- Echo Ridge scoring fields (required for determinism)
    final_score REAL NOT NULL,
    d_score REAL NOT NULL,
    o_score REAL NOT NULL,
    i_score REAL NOT NULL,
    m_score REAL NOT NULL,
    b_score REAL NOT NULL,
    confidence_score REAL NOT NULL,
    norm_context_version TEXT NOT NULL,
    checksum TEXT NOT NULL,
    risk_score REAL,
    feasibility_score REAL,
    -- Metadata
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    synced_at TEXT,
    is_active INTEGER DEFAULT 1,
    tombstone_at TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
CREATE INDEX IF NOT EXISTS idx_companies_region ON companies(region);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_score ON companies(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_companies_updated ON companies(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active, tombstone_at);

-- Company aliases for alternative names
CREATE TABLE IF NOT EXISTS company_aliases (
    alias_id TEXT PRIMARY KEY,
    global_company_id TEXT NOT NULL,
    alias TEXT NOT NULL,
    alias_type TEXT CHECK(alias_type IN ('legal', 'dba', 'brand', 'former', 'other')),
    created_at TEXT NOT NULL,
    FOREIGN KEY (global_company_id) REFERENCES companies(global_company_id)
);

-- FTS virtual table for company search
CREATE VIRTUAL TABLE IF NOT EXISTS companies_fts USING fts5(
    global_company_id UNINDEXED,
    name,
    domain,
    content=companies
);

-- FTS virtual table for aliases
CREATE VIRTUAL TABLE IF NOT EXISTS aliases_fts USING fts5(
    alias_id UNINDEXED,
    global_company_id UNINDEXED,
    alias,
    content=company_aliases
);

-- Evidence pointers (lightweight previews only)
CREATE TABLE IF NOT EXISTS evidence (
    evidence_id TEXT PRIMARY KEY,
    global_company_id TEXT NOT NULL,
    type TEXT CHECK(type IN ('article', 'report', 'filing', 'website', 'social', 'other')),
    title TEXT NOT NULL,
    preview TEXT NOT NULL,
    source_url TEXT,
    source_name TEXT,
    relevance_score REAL,
    created_at TEXT NOT NULL,
    extracted_at TEXT,
    FOREIGN KEY (global_company_id) REFERENCES companies(global_company_id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_company ON evidence(global_company_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(type);

-- Pre-computed facet buckets for instant filtering
CREATE TABLE IF NOT EXISTS facet_buckets (
    facet_type TEXT NOT NULL,
    bucket_value TEXT NOT NULL,
    count INTEGER NOT NULL,
    dataset_version TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (facet_type, bucket_value)
);

CREATE INDEX IF NOT EXISTS idx_facets_type ON facet_buckets(facet_type);

-- Scoring runs metadata
CREATE TABLE IF NOT EXISTS scoring_runs (
    run_id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    companies_scored INTEGER NOT NULL,
    avg_confidence REAL NOT NULL,
    norm_context_version TEXT NOT NULL,
    status TEXT CHECK(status IN ('running', 'completed', 'failed')),
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_completed ON scoring_runs(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_status ON scoring_runs(status);

-- Drift alerts for score changes
CREATE TABLE IF NOT EXISTS drift_alerts (
    alert_id TEXT PRIMARY KEY,
    global_company_id TEXT NOT NULL,
    metric TEXT CHECK(metric IN ('d_score', 'o_score', 'i_score', 'm_score', 'b_score', 'final_score')),
    old_value REAL NOT NULL,
    new_value REAL NOT NULL,
    drift_percentage REAL NOT NULL,
    detected_at TEXT NOT NULL,
    run_id TEXT NOT NULL,
    seen_at TEXT, -- Local only field
    FOREIGN KEY (global_company_id) REFERENCES companies(global_company_id),
    FOREIGN KEY (run_id) REFERENCES scoring_runs(run_id)
);

CREATE INDEX IF NOT EXISTS idx_drift_company ON drift_alerts(global_company_id);
CREATE INDEX IF NOT EXISTS idx_drift_seen ON drift_alerts(seen_at);
CREATE INDEX IF NOT EXISTS idx_drift_detected ON drift_alerts(detected_at DESC);

-- Service statistics
CREATE TABLE IF NOT EXISTS service_stats (
    stat_name TEXT PRIMARY KEY,
    stat_value REAL NOT NULL,
    unit TEXT,
    measured_at TEXT NOT NULL
);

-- Sync state tracking
CREATE TABLE IF NOT EXISTS sync_state (
    resource_type TEXT PRIMARY KEY CHECK(resource_type IN ('companies', 'evidence', 'scores', 'runs', 'drift', 'stats')),
    last_sync_at TEXT,
    last_etag TEXT,
    last_cursor TEXT,
    sync_status TEXT CHECK(sync_status IN ('pending', 'syncing', 'success', 'error')),
    error_message TEXT,
    records_synced INTEGER
);

-- User overlay tables (local/syncable)

-- Workspace bookmarks
CREATE TABLE IF NOT EXISTS workspace_bookmarks (
    user_id TEXT NOT NULL,
    org_id TEXT,
    global_company_id TEXT NOT NULL,
    tags TEXT, -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, global_company_id),
    FOREIGN KEY (global_company_id) REFERENCES companies(global_company_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON workspace_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_org ON workspace_bookmarks(org_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON workspace_bookmarks(created_at DESC);

-- Workspace comparisons
CREATE TABLE IF NOT EXISTS workspace_comparisons (
    comparison_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    org_id TEXT,
    name TEXT NOT NULL,
    company_ids TEXT NOT NULL, -- JSON array of global_company_ids
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comparisons_user ON workspace_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_org ON workspace_comparisons(org_id);

-- Workspace notes
CREATE TABLE IF NOT EXISTS workspace_notes (
    note_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    org_id TEXT,
    global_company_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (global_company_id) REFERENCES companies(global_company_id)
);

CREATE INDEX IF NOT EXISTS idx_notes_user ON workspace_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_company ON workspace_notes(global_company_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON workspace_notes(updated_at DESC);

-- Search history
CREATE TABLE IF NOT EXISTS search_history (
    search_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    org_id TEXT,
    query TEXT NOT NULL,
    filters TEXT, -- JSON
    result_count INTEGER NOT NULL,
    executed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_executed ON search_history(executed_at DESC);

-- Triggers to maintain FTS tables
CREATE TRIGGER IF NOT EXISTS companies_fts_insert AFTER INSERT ON companies
BEGIN
    INSERT INTO companies_fts(global_company_id, name, domain)
    VALUES (new.global_company_id, new.name, new.domain);
END;

CREATE TRIGGER IF NOT EXISTS companies_fts_update AFTER UPDATE ON companies
BEGIN
    UPDATE companies_fts 
    SET name = new.name, domain = new.domain
    WHERE global_company_id = new.global_company_id;
END;

CREATE TRIGGER IF NOT EXISTS companies_fts_delete AFTER DELETE ON companies
BEGIN
    DELETE FROM companies_fts WHERE global_company_id = old.global_company_id;
END;

CREATE TRIGGER IF NOT EXISTS aliases_fts_insert AFTER INSERT ON company_aliases
BEGIN
    INSERT INTO aliases_fts(alias_id, global_company_id, alias)
    VALUES (new.alias_id, new.global_company_id, new.alias);
END;

CREATE TRIGGER IF NOT EXISTS aliases_fts_update AFTER UPDATE ON company_aliases
BEGIN
    UPDATE aliases_fts 
    SET alias = new.alias
    WHERE alias_id = new.alias_id;
END;

CREATE TRIGGER IF NOT EXISTS aliases_fts_delete AFTER DELETE ON company_aliases
BEGIN
    DELETE FROM aliases_fts WHERE alias_id = old.alias_id;
END;