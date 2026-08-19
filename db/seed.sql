-- Development-only seed data. All companies are fictional.

INSERT OR IGNORE INTO companies (
    id, slug, name, description, official_url, recruit_url, industry,
    remote_scope, work_location_scope, work_location_note,
    office_required, office_note, recruiting_status, publication_status,
    last_verified_at, remote_verified_at, recruiting_verified_at,
    created_at, updated_at
) VALUES
(
    '11111111-1111-4111-8111-111111111111',
    'remote-leaf',
    '株式会社リモートリーフ',
    '分散チーム向けの業務支援サービスを開発する架空企業です。',
    'https://example.com/remote-leaf',
    'https://example.com/remote-leaf/careers',
    'ソフトウェア',
    'partial',
    'nationwide',
    NULL,
    'no',
    NULL,
    'open',
    'published',
    '2026-08-19T00:00:00.000Z',
    '2026-08-19T00:00:00.000Z',
    '2026-08-19T00:00:00.000Z',
    '2026-08-19T00:00:00.000Z',
    '2026-08-19T00:00:00.000Z'
),
(
    '22222222-2222-4222-8222-222222222222',
    'next-wave-lab',
    'ネクストウェーブ合同会社',
    '地域事業者向けのデータ活用を支援する架空企業です。',
    'https://example.com/next-wave-lab',
    'https://example.com/next-wave-lab/jobs',
    'コンサルティング',
    'partial',
    'restricted',
    '必要時に東京オフィスへ出社できる地域',
    'yes',
    '四半期に1回程度',
    'closed',
    'needs_review',
    '2026-08-18T00:00:00.000Z',
    '2026-08-18T00:00:00.000Z',
    '2026-08-18T00:00:00.000Z',
    '2026-08-18T00:00:00.000Z',
    '2026-08-18T00:00:00.000Z'
);

INSERT OR IGNORE INTO company_sources (
    id, company_id, source_type, url, is_active,
    last_checked_at, last_content_hash, last_fetch_status,
    consecutive_failures, created_at, updated_at
) VALUES
(
    '31111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'recruit',
    'https://example.com/remote-leaf/careers',
    1,
    '2026-08-19T00:00:00.000Z',
    'development-seed-hash-1',
    'success',
    0,
    '2026-08-19T00:00:00.000Z',
    '2026-08-19T00:00:00.000Z'
),
(
    '32222222-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    'jobs',
    'https://example.com/next-wave-lab/jobs',
    1,
    '2026-08-18T00:00:00.000Z',
    'development-seed-hash-2',
    'success',
    0,
    '2026-08-18T00:00:00.000Z',
    '2026-08-18T00:00:00.000Z'
);

INSERT OR IGNORE INTO company_checks (
    id, company_id, started_at, completed_at, status,
    content_changed, ai_used, ai_confidence,
    error_code, error_message, created_at
) VALUES (
    '41111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '2026-08-19T01:00:00.000Z',
    '2026-08-19T01:01:00.000Z',
    'changed',
    1,
    1,
    0.92,
    NULL,
    NULL,
    '2026-08-19T01:00:00.000Z'
);

INSERT OR IGNORE INTO company_change_candidates (
    id, company_id, check_id, field_name, old_value, new_value,
    evidence_text, source_url, confidence,
    review_status, reviewed_at, created_at
) VALUES (
    '51111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '41111111-1111-4111-8111-111111111111',
    'recruiting_status',
    'closed',
    'open',
    'フルリモート対象ポジションの募集を開始しました。',
    'https://example.com/next-wave-lab/jobs',
    0.92,
    'pending',
    NULL,
    '2026-08-19T01:01:00.000Z'
);
