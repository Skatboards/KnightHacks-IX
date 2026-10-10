-- Nutrigo food collectible schema
-- Requires migrations 0001_create_user_data.sql and
-- 0002_create_locations_and_routes.sql to have been applied.

CREATE TABLE food_collectible_types (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    name TEXT NOT NULL CHECK (btrim(name) <> ''),
    description TEXT,
    category TEXT NOT NULL CHECK (btrim(category) <> ''),
    rarity TEXT NOT NULL CHECK (btrim(rarity) <> ''),
    nutrition_data JSONB NOT NULL
        CHECK (
            jsonb_typeof(nutrition_data) = 'object'
            AND nutrition_data ? 'calories'
            AND nutrition_data ? 'serving_unit'
            AND jsonb_typeof(nutrition_data -> 'calories') = 'number'
            AND jsonb_typeof(nutrition_data -> 'serving_unit') = 'string'
            AND btrim(nutrition_data ->> 'serving_unit') <> ''
        ),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB
        CHECK (jsonb_typeof(metadata) = 'object'),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX food_collectible_types_active_category_idx
    ON food_collectible_types (category)
    WHERE is_active;

CREATE TABLE food_collectible_appearances (
    poi_id UUID NOT NULL
        REFERENCES pois (id)
        ON DELETE RESTRICT,
    food_collectible_type_id UUID NOT NULL
        REFERENCES food_collectible_types (id)
        ON DELETE RESTRICT,
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB
        CHECK (jsonb_typeof(metadata) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (poi_id, food_collectible_type_id),
    CONSTRAINT food_collectible_appearances_window_check
        CHECK (
            available_until IS NULL
            OR available_from IS NULL
            OR available_until > available_from
        )
);

CREATE INDEX food_collectible_appearances_type_idx
    ON food_collectible_appearances (
        food_collectible_type_id,
        poi_id,
        available_from,
        available_until
    )
    WHERE is_active;

CREATE TABLE user_food_collectibles (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id UUID NOT NULL
        REFERENCES users (id)
        ON DELETE RESTRICT,
    food_collectible_type_id UUID NOT NULL
        REFERENCES food_collectible_types (id)
        ON DELETE RESTRICT,
    acquired_poi_id UUID NOT NULL
        REFERENCES pois (id)
        ON DELETE RESTRICT,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'transferred', 'released')),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB
        CHECK (jsonb_typeof(metadata) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deliberately no unique constraint exists on (user_id, food_collectible_type_id):
-- users may own multiple instances of the same food collectible type.
CREATE INDEX user_food_collectibles_collection_idx
    ON user_food_collectibles (user_id, status, acquired_at DESC);

CREATE INDEX user_food_collectibles_type_idx
    ON user_food_collectibles (food_collectible_type_id, acquired_poi_id);

CREATE TABLE food_collectible_events (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_food_collectible_id UUID NOT NULL
        REFERENCES user_food_collectibles (id)
        ON DELETE RESTRICT,
    actor_user_id UUID NOT NULL
        REFERENCES users (id)
        ON DELETE RESTRICT,
    from_user_id UUID
        REFERENCES users (id)
        ON DELETE RESTRICT,
    to_user_id UUID
        REFERENCES users (id)
        ON DELETE RESTRICT,
    event_type TEXT NOT NULL CHECK (btrim(event_type) <> ''),
    poi_id UUID
        REFERENCES pois (id)
        ON DELETE RESTRICT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB
        CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT food_collectible_events_acquisition_poi_check
        CHECK (event_type <> 'acquired' OR poi_id IS NOT NULL),
    CONSTRAINT food_collectible_events_distinct_users_check
        CHECK (
            from_user_id IS NULL
            OR to_user_id IS NULL
            OR from_user_id <> to_user_id
        )
);

CREATE INDEX food_collectible_events_history_idx
    ON food_collectible_events (
        user_food_collectible_id,
        occurred_at DESC
    );

CREATE INDEX food_collectible_events_actor_idx
    ON food_collectible_events (actor_user_id, occurred_at DESC);

CREATE INDEX food_collectible_events_from_user_idx
    ON food_collectible_events (from_user_id, occurred_at DESC)
    WHERE from_user_id IS NOT NULL;

CREATE INDEX food_collectible_events_to_user_idx
    ON food_collectible_events (to_user_id, occurred_at DESC)
    WHERE to_user_id IS NOT NULL;

CREATE TRIGGER food_collectible_types_set_updated_at
BEFORE UPDATE ON food_collectible_types
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER food_collectible_appearances_set_updated_at
BEFORE UPDATE ON food_collectible_appearances
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_food_collectibles_set_updated_at
BEFORE UPDATE ON user_food_collectibles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
