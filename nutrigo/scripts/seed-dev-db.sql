-- Deterministic local data for API and Bruno tests.
-- This file is safe to run repeatedly.

BEGIN;

INSERT INTO users (
    id,
    auth_subject,
    display_name,
    username,
    status,
    deleted_at
)
VALUES (
    '11111111-1111-4111-8111-111111111111',
    'local-dev-user',
    'Local Development User',
    'local-dev',
    'active',
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    auth_subject = EXCLUDED.auth_subject,
    display_name = EXCLUDED.display_name,
    username = EXCLUDED.username,
    status = EXCLUDED.status,
    deleted_at = EXCLUDED.deleted_at;

INSERT INTO user_preferences (user_id)
VALUES ('11111111-1111-4111-8111-111111111111')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO food_collectible_types (
    id,
    external_id,
    name,
    description,
    category,
    rarity,
    asset_key,
    nutrition_data,
    metadata
)
VALUES
    (
        '22222222-2222-4222-8222-222222222222',
        'usda:fdc:747448',
        'Placeholder Golden Apple',
        'A deterministic food record for local development.',
        'fruit',
        'common',
        'golden-apple',
        '{"calories": 95, "serving_amount": 100, "serving_unit": "g", "basis": "per_100g"}'::jsonb,
        '{"source": "local-seed"}'::jsonb
    ),
    (
        '33333333-3333-4333-8333-333333333333',
        'dev:placeholder:banana',
        'Placeholder Banana',
        'A deterministic food record for local development.',
        'fruit',
        'common',
        'banana',
        '{"calories": 89, "serving_amount": 100, "serving_unit": "g", "basis": "per_100g"}'::jsonb,
        '{"source": "local-seed"}'::jsonb
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        'dev:placeholder:trail-mix',
        'Placeholder Trail Mix',
        'A deterministic food record for local development.',
        'snack',
        'rare',
        'trail-mix',
        '{"calories": 462, "serving_amount": 100, "serving_unit": "g", "basis": "per_100g"}'::jsonb,
        '{"source": "local-seed"}'::jsonb
    ),
    (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'dev:placeholder:released-pear',
        'Placeholder Released Pear',
        'A deterministic previously-owned food record for local development.',
        'fruit',
        'uncommon',
        'released-pear',
        '{"calories": 57, "serving_amount": 100, "serving_unit": "g", "basis": "per_100g"}'::jsonb,
        '{"source": "local-seed"}'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET
    external_id = EXCLUDED.external_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    rarity = EXCLUDED.rarity,
    asset_key = EXCLUDED.asset_key,
    nutrition_data = EXCLUDED.nutrition_data,
    metadata = EXCLUDED.metadata,
    is_active = TRUE;

INSERT INTO pois (
    id,
    name,
    poi_type,
    description,
    location,
    metadata
)
VALUES
    (
        '55555555-5555-4555-8555-555555555555',
        'Local Seed Trailhead',
        'food_collectible',
        'A deterministic POI for local development.',
        ST_SetSRID(ST_MakePoint(-81.1992, 28.6017), 4326)::geography,
        '{"source": "local-seed"}'::jsonb
    ),
    (
        '66666666-6666-4666-8666-666666666666',
        'Local Seed Garden',
        'food_collectible',
        'A deterministic POI for local development.',
        ST_SetSRID(ST_MakePoint(-81.2024, 28.6015), 4326)::geography,
        '{"source": "local-seed"}'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    poi_type = EXCLUDED.poi_type,
    description = EXCLUDED.description,
    location = EXCLUDED.location,
    metadata = EXCLUDED.metadata,
    is_active = TRUE;

INSERT INTO food_collectible_appearances (
    id,
    poi_id,
    food_collectible_type_id,
    metadata
)
VALUES
    (
        '77777777-7777-4777-8777-777777777777',
        '55555555-5555-4555-8555-555555555555',
        '22222222-2222-4222-8222-222222222222',
        '{"source": "local-seed"}'::jsonb
    ),
    (
        '88888888-8888-4888-8888-888888888888',
        '66666666-6666-4666-8666-666666666666',
        '33333333-3333-4333-8333-333333333333',
        '{"source": "local-seed"}'::jsonb
    ),
    (
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        '66666666-6666-4666-8666-666666666666',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        '{"source": "local-seed"}'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET
    poi_id = EXCLUDED.poi_id,
    food_collectible_type_id = EXCLUDED.food_collectible_type_id,
    metadata = EXCLUDED.metadata,
    is_active = TRUE;

INSERT INTO user_food_collectibles (
    id,
    user_id,
    food_collectible_type_id,
    acquired_poi_id,
    acquired_at,
    status,
    metadata
)
VALUES
    (
        '99999999-9999-4999-8999-999999999991',
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        '55555555-5555-4555-8555-555555555555',
        '2026-01-01T12:00:00Z',
        'active',
        '{"source": "local-seed"}'::jsonb
    ),
    (
        '99999999-9999-4999-8999-999999999992',
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '66666666-6666-4666-8666-666666666666',
        '2026-01-02T12:00:00Z',
        'active',
        '{"source": "local-seed"}'::jsonb
    ),
    (
        '99999999-9999-4999-8999-999999999993',
        '11111111-1111-4111-8111-111111111111',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        '66666666-6666-4666-8666-666666666666',
        '2026-01-03T12:00:00Z',
        'released',
        '{"source": "local-seed"}'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    food_collectible_type_id = EXCLUDED.food_collectible_type_id,
    acquired_poi_id = EXCLUDED.acquired_poi_id,
    acquired_at = EXCLUDED.acquired_at,
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata;

INSERT INTO food_collectible_events (
    id,
    user_food_collectible_id,
    actor_user_id,
    to_user_id,
    event_type,
    poi_id,
    occurred_at,
    metadata
)
VALUES
    (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        '99999999-9999-4999-8999-999999999991',
        '11111111-1111-4111-8111-111111111111',
        '11111111-1111-4111-8111-111111111111',
        'acquired',
        '55555555-5555-4555-8555-555555555555',
        '2026-01-01T12:00:00Z',
        '{"source": "local-seed"}'::jsonb
    ),
    (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
        '99999999-9999-4999-8999-999999999992',
        '11111111-1111-4111-8111-111111111111',
        '11111111-1111-4111-8111-111111111111',
        'acquired',
        '66666666-6666-4666-8666-666666666666',
        '2026-01-02T12:00:00Z',
        '{"source": "local-seed"}'::jsonb
    ),
    (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
        '99999999-9999-4999-8999-999999999993',
        '11111111-1111-4111-8111-111111111111',
        '11111111-1111-4111-8111-111111111111',
        'acquired',
        '66666666-6666-4666-8666-666666666666',
        '2026-01-03T12:00:00Z',
        '{"source": "local-seed"}'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET
    user_food_collectible_id = EXCLUDED.user_food_collectible_id,
    actor_user_id = EXCLUDED.actor_user_id,
    to_user_id = EXCLUDED.to_user_id,
    event_type = EXCLUDED.event_type,
    poi_id = EXCLUDED.poi_id,
    occurred_at = EXCLUDED.occurred_at,
    metadata = EXCLUDED.metadata;

COMMIT;
