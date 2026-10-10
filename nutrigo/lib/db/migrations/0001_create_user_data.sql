-- Nutrigo user data schema
-- Requires PostgreSQL 18+ with the PostGIS extension available.

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

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
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
