-- Step 9: durable bulk company checks

CREATE TABLE company_update_runs (
    id TEXT PRIMARY KEY,
    workflow_instance_id TEXT NOT NULL UNIQUE,

    status TEXT NOT NULL
        CHECK (status IN ('queued', 'running', 'completed', 'failed')),

    total_companies INTEGER NOT NULL DEFAULT 0
        CHECK (total_companies >= 0),
    processed_companies INTEGER NOT NULL DEFAULT 0
        CHECK (processed_companies >= 0),
    unchanged_companies INTEGER NOT NULL DEFAULT 0
        CHECK (unchanged_companies >= 0),
    changed_companies INTEGER NOT NULL DEFAULT 0
        CHECK (changed_companies >= 0),
    needs_review_companies INTEGER NOT NULL DEFAULT 0
        CHECK (needs_review_companies >= 0),
    failed_companies INTEGER NOT NULL DEFAULT 0
        CHECK (failed_companies >= 0),
    candidate_count INTEGER NOT NULL DEFAULT 0
        CHECK (candidate_count >= 0),

    error_message TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    CHECK (processed_companies <= total_companies)
);

CREATE TABLE company_update_run_checks (
    run_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    check_id TEXT UNIQUE,
    outcome TEXT
        CHECK (
            outcome IS NULL
            OR outcome IN ('unchanged', 'changed', 'needs_review', 'failed')
        ),
    candidate_count INTEGER NOT NULL DEFAULT 0
        CHECK (candidate_count >= 0),
    progress_token TEXT UNIQUE,
    processed_at TEXT,
    created_at TEXT NOT NULL,

    PRIMARY KEY (run_id, company_id),

    FOREIGN KEY (run_id)
        REFERENCES company_update_runs(id)
        ON DELETE CASCADE,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    FOREIGN KEY (check_id)
        REFERENCES company_checks(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_company_update_runs_active
    ON company_update_runs ((1))
    WHERE status IN ('queued', 'running');

CREATE INDEX idx_company_update_runs_created
    ON company_update_runs(created_at DESC);

CREATE INDEX idx_company_update_run_checks_check
    ON company_update_run_checks(check_id);

PRAGMA optimize;
