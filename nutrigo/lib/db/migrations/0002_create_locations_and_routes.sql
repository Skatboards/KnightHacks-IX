-- Nutrigo locations and routes schema
-- Requires PostgreSQL 18+ and the PostGIS extension.

CREATE EXTENSION IF NOT EXISTS postgis;

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

CREATE TRIGGER pois_set_updated_at
BEFORE UPDATE ON pois
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER saved_routes_set_updated_at
BEFORE UPDATE ON saved_routes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
