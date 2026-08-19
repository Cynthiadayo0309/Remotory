-- Remotory - Cloudflare D1 initial schema
-- SQLite / D1

CREATE TABLE companies (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,

    name TEXT NOT NULL,
    description TEXT,

    official_url TEXT,
    recruit_url TEXT,
    industry TEXT,

    remote_scope TEXT NOT NULL DEFAULT 'unknown'
        CHECK (remote_scope IN ('all', 'partial', 'unknown')),

    work_location_scope TEXT NOT NULL DEFAULT 'unknown'
        CHECK (work_location_scope IN ('nationwide', 'restricted', 'unknown')),

    work_location_note TEXT,

    office_required TEXT NOT NULL DEFAULT 'unknown'
        CHECK (office_required IN ('yes', 'no', 'unknown')),

    office_note TEXT,

    recruiting_status TEXT NOT NULL DEFAULT 'unknown'
        CHECK (recruiting_status IN ('open', 'closed', 'unknown')),

    publication_status TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (publication_status IN ('published', 'needs_review', 'hidden')),

    last_verified_at TEXT,
    remote_verified_at TEXT,
    recruiting_verified_at TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE company_sources (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,

    source_type TEXT NOT NULL
        CHECK (source_type IN ('official', 'recruit', 'jobs', 'workstyle', 'other')),

    url TEXT NOT NULL,

    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),

    last_checked_at TEXT,
    last_content_hash TEXT,

    last_fetch_status TEXT
        CHECK (
            last_fetch_status IS NULL
            OR last_fetch_status IN ('success', 'failed')
        ),

    consecutive_failures INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    UNIQUE (company_id, url)
);

CREATE TABLE company_checks (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,

    started_at TEXT NOT NULL,
    completed_at TEXT,

    status TEXT NOT NULL
        CHECK (status IN ('success', 'changed', 'failed', 'needs_review')),

    content_changed INTEGER
        CHECK (
            content_changed IS NULL
            OR content_changed IN (0, 1)
        ),

    ai_used INTEGER NOT NULL DEFAULT 0
        CHECK (ai_used IN (0, 1)),

    ai_confidence REAL,

    error_code TEXT,
    error_message TEXT,

    created_at TEXT NOT NULL,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE
);

CREATE TABLE company_change_candidates (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    check_id TEXT,

    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,

    evidence_text TEXT,
    source_url TEXT,
    confidence REAL,

    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'approved', 'rejected')),

    reviewed_at TEXT,
    created_at TEXT NOT NULL,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    FOREIGN KEY (check_id)
        REFERENCES company_checks(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_companies_publication_status
    ON companies(publication_status);

CREATE INDEX idx_companies_recruiting_status
    ON companies(recruiting_status);

CREATE INDEX idx_companies_location
    ON companies(work_location_scope);

CREATE INDEX idx_companies_industry
    ON companies(industry);

CREATE INDEX idx_companies_last_verified
    ON companies(last_verified_at);

CREATE INDEX idx_company_sources_company
    ON company_sources(company_id);

CREATE INDEX idx_company_checks_company
    ON company_checks(company_id, created_at);

CREATE INDEX idx_change_candidates_company
    ON company_change_candidates(company_id);

CREATE INDEX idx_change_candidates_review_status
    ON company_change_candidates(review_status);

PRAGMA optimize;
