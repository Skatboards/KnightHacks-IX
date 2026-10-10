-- Nutrigo initial database schema
-- Requires PostgreSQL 18+ for native uuidv7() support.
-- Requires the PostGIS extension for geography types and spatial functions.

-- ============================================================================
-- Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- Users and preferences
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    auth_subject TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL CHECK (btrim(display_name) <> ''),
    username TEXT UNIQUE CHECK (username IS NULL OR btrim(username) <> ''),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT users_deleted_at_status_check
        CHECK ((status = 'deleted') = (deleted_at IS NOT NULL))
);

CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY
        REFERENCES users (id)
        ON DELETE CASCADE,
    unit_system TEXT NOT NULL DEFAULT 'metric'
        CHECK (unit_system IN ('metric', 'imperial')),
    distance_unit TEXT NOT NULL DEFAULT 'kilometers'
        CHECK (distance_unit IN ('kilometers', 'miles')),
    dietary_preferences JSONB NOT NULL DEFAULT '{}'::JSONB
        CHECK (jsonb_typeof(dietary_preferences) = 'object'),
    calorie_goal INTEGER
        CHECK (calorie_goal IS NULL OR calorie_goal >= 0),
    notification_settings JSONB NOT NULL DEFAULT '{}'::JSONB
        CHECK (jsonb_typeof(notification_settings) = 'object'),
    settings JSONB NOT NULL DEFAULT '{}'::JSONB
        CHECK (jsonb_typeof(settings) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Locations and POI moderation
-- ============================================================================

CREATE TABLE pois (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    name TEXT NOT NULL CHECK (btrim(name) <> ''),
    poi_type TEXT NOT NULL CHECK (btrim(poi_type) <> ''),
    description TEXT,
    address TEXT,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB
        CHECK (jsonb_typeof(metadata) = 'object'),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pois_location_not_empty_check
        CHECK (NOT ST_IsEmpty(location::geometry))
);

CREATE INDEX pois_location_gist_idx
    ON pois USING GIST (location);

CREATE INDEX pois_active_type_idx
    ON pois (poi_type)
    WHERE is_active;

-- Internal moderation records for proposed POIs. Approved proposals may point
-- to the resulting canonical POI through resolved_poi_id.
CREATE TABLE poi_submissions (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    submitter_user_id UUID NOT NULL
        REFERENCES users (id)
        ON DELETE RESTRICT,
    name TEXT NOT NULL CHECK (btrim(name) <> ''),
    poi_type TEXT NOT NULL CHECK (btrim(poi_type) <> ''),
    description TEXT,
    address TEXT,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB
        CHECK (jsonb_typeof(metadata) = 'object'),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
    review_notes TEXT,
    resolved_poi_id UUID
        REFERENCES pois (id)
        ON DELETE RESTRICT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT poi_submissions_location_not_empty_check
        CHECK (NOT ST_IsEmpty(location::geometry)),
    CONSTRAINT poi_submissions_resolution_state_check
        CHECK (
            (status = 'pending'
                AND resolved_poi_id IS NULL
                AND resolved_at IS NULL)
            OR (status = 'approved'
                AND resolved_poi_id IS NOT NULL
                AND resolved_at IS NOT NULL)
            OR (status IN ('rejected', 'duplicate')
                AND resolved_poi_id IS NULL
                AND resolved_at IS NOT NULL)
        )
);

CREATE INDEX poi_submissions_moderation_queue_idx
    ON poi_submissions (status, submitted_at DESC)
    WHERE status = 'pending';

CREATE INDEX poi_submissions_submitter_idx
    ON poi_submissions (submitter_user_id, submitted_at DESC);

CREATE INDEX poi_submissions_location_gist_idx
    ON poi_submissions USING GIST (location);

-- ============================================================================
-- Saved routes and route geometry
-- ============================================================================

CREATE TABLE saved_routes (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id UUID NOT NULL
        REFERENCES users (id)
        ON DELETE RESTRICT,
    name TEXT NOT NULL CHECK (btrim(name) <> ''),
    description TEXT,
    route_path GEOGRAPHY(LineString, 4326) NOT NULL,
    distance_meters DOUBLE PRECISION NOT NULL
        CHECK (distance_meters >= 0),
    estimated_duration_seconds INTEGER
        CHECK (
            estimated_duration_seconds IS NULL
            OR estimated_duration_seconds >= 0
        ),
    visibility TEXT NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private', 'shared', 'public')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT saved_routes_path_valid_check
        CHECK (
            NOT ST_IsEmpty(route_path::geometry)
            AND ST_NPoints(route_path::geometry) >= 2
        )
);

CREATE INDEX saved_routes_user_updated_idx
    ON saved_routes (user_id, updated_at DESC);

CREATE INDEX saved_routes_path_gist_idx
    ON saved_routes USING GIST (route_path);

CREATE TABLE saved_route_pois (
    route_id UUID NOT NULL
        REFERENCES saved_routes (id)
        ON DELETE CASCADE,
    poi_id UUID NOT NULL
        REFERENCES pois (id)
        ON DELETE RESTRICT,
    sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
    PRIMARY KEY (route_id, sequence_number)
);

CREATE INDEX saved_route_pois_poi_idx
    ON saved_route_pois (poi_id);

CREATE TABLE route_waypoints (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    route_id UUID NOT NULL
        REFERENCES saved_routes (id)
        ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
    location GEOGRAPHY(Point, 4326) NOT NULL,
    CONSTRAINT route_waypoints_route_sequence_key
        UNIQUE (route_id, sequence_number),
    CONSTRAINT route_waypoints_location_not_empty_check
        CHECK (NOT ST_IsEmpty(location::geometry))
);

CREATE INDEX route_waypoints_location_gist_idx
    ON route_waypoints USING GIST (location);

-- ============================================================================
-- Food collectible definitions and appearances
-- ============================================================================

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
    id UUID PRIMARY KEY DEFAULT uuidv7(),
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
    CONSTRAINT food_collectible_appearances_window_check
        CHECK (
            available_until IS NULL
            OR available_from IS NULL
            OR available_until > available_from
        )
);

-- No uniqueness constraint exists on (poi_id, food_collectible_type_id):
-- a POI may have multiple appearances of the same collectible type.
CREATE INDEX food_collectible_appearances_type_idx
    ON food_collectible_appearances (
        food_collectible_type_id,
        poi_id,
        available_from,
        available_until
    )
    WHERE is_active;

-- ============================================================================
-- User-owned collectibles and lifecycle events
-- ============================================================================

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

-- Users may own multiple instances of the same food collectible type.
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
        ),
    CONSTRAINT food_collectible_events_transfer_shape_check
        CHECK (
            (event_type = 'acquired'
                AND from_user_id IS NULL
                AND to_user_id IS NOT NULL)
            OR (event_type = 'transferred'
                AND from_user_id IS NOT NULL
                AND to_user_id IS NOT NULL)
            OR (event_type = 'released'
                AND from_user_id IS NOT NULL
                AND to_user_id IS NULL)
            OR event_type NOT IN ('acquired', 'transferred', 'released')
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

-- ============================================================================
-- Shared functions and triggers
-- ============================================================================

-- Keeps mutable records' updated_at value in sync with database writes.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Calculates route distance in meters from the canonical geography path.
CREATE OR REPLACE FUNCTION set_route_distance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.distance_meters = ST_Length(NEW.route_path);
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_preferences_set_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pois_set_updated_at
BEFORE UPDATE ON pois
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER saved_routes_set_updated_at
BEFORE UPDATE ON saved_routes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER saved_routes_set_distance
BEFORE INSERT OR UPDATE OF route_path ON saved_routes
FOR EACH ROW
EXECUTE FUNCTION set_route_distance();

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
