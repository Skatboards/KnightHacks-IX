import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getDemoPoi,
  markDemoPoiCollected,
} from "@/lib/demo-store";

type CollectibleRequest = {
  poiId: string;
  collectibleTypeId: string;
  latitude: number;
  longitude: number;
};

const MAX_COLLECTION_DISTANCE_METERS = 20;

function isCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function distanceInMeters(
  latitude: number,
  longitude: number,
  targetLatitude: number,
  targetLongitude: number
) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = ((targetLatitude - latitude) * Math.PI) / 180;
  const longitudeDelta = ((targetLongitude - longitude) * Math.PI) / 180;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const targetLatitudeRadians = (targetLatitude * Math.PI) / 180;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeRadians) *
      Math.cos(targetLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(request: Request) {
  let body: CollectibleRequest;

  try {
    body = (await request.json()) as CollectibleRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (
    !body.poiId ||
    !body.collectibleTypeId ||
    !isCoordinate(body.latitude) ||
    !isCoordinate(body.longitude)
  ) {
    return NextResponse.json(
      {
        error:
          "poiId, collectibleTypeId, latitude, and longitude are required",
      },
      { status: 400 }
    );
  }

  if (!process.env.DATABASE_URL) {
    const poi = getDemoPoi(body.poiId);
    if (!poi || poi.collectibleTypeId !== body.collectibleTypeId) {
      return NextResponse.json({ error: "POI was not found" }, { status: 404 });
    }

    const distance = distanceInMeters(
      body.latitude,
      body.longitude,
      poi.latitude,
      poi.longitude
    );

    if (distance > MAX_COLLECTION_DISTANCE_METERS) {
      return NextResponse.json(
        {
          error: `Move within ${MAX_COLLECTION_DISTANCE_METERS} meters to collect this item.`,
        },
        { status: 400 }
      );
    }

    if (!markDemoPoiCollected(poi.poiId)) {
      return NextResponse.json(
        { error: "This collectible has already been collected" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        id: poi.poiId,
        acquiredAt: new Date().toISOString(),
        name: poi.name,
        points: poi.points,
        source: poi.source,
        demo: true,
      },
      { status: 201 }
    );
  }

  const userId = process.env.NUTRIGO_USER_ID;
  if (!userId) {
    return NextResponse.json(
      { error: "NUTRIGO_USER_ID is not configured on the server" },
      { status: 500 }
    );
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        SELECT id
        FROM users
        WHERE id = $1
          AND status = 'active'
      `,
      [userId]
    );

    if (!userResult.rows[0]) {
      throw new Error("Configured Nutrigo user was not found");
    }

    const poiResult = await client.query<{
      latitude: number;
      longitude: number;
      source: "step_path" | "hard_coded" | null;
      points: number;
      name: string;
    }>(
      `
        SELECT
          ST_Y(location::geometry) AS latitude,
          ST_X(location::geometry) AS longitude,
          metadata->>'source' AS source,
          COALESCE((metadata->>'points')::integer, 150) AS points,
          name
        FROM pois
        WHERE id = $1
          AND is_active = TRUE
      `,
      [body.poiId]
    );

    const poi = poiResult.rows[0];
    if (!poi) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "POI was not found" }, { status: 404 });
    }

    const appearanceResult = await client.query(
      `
        SELECT id
        FROM food_collectible_appearances
        WHERE poi_id = $1
          AND food_collectible_type_id = $2
          AND is_active = TRUE
          AND (available_from IS NULL OR available_from <= now())
          AND (available_until IS NULL OR available_until >= now())
        LIMIT 1
      `,
      [body.poiId, body.collectibleTypeId]
    );

    if (!appearanceResult.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "This collectible is not available at this POI" },
        { status: 409 }
      );
    }

    const distance = distanceInMeters(
      body.latitude,
      body.longitude,
      poi.latitude,
      poi.longitude
    );

    if (distance > MAX_COLLECTION_DISTANCE_METERS) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: `Move within ${MAX_COLLECTION_DISTANCE_METERS} meters to collect this item.`,
        },
        { status: 400 }
      );
    }

    const collectibleResult = await client.query<{
      id: string;
      acquired_at: Date;
    }>(
      `
        INSERT INTO user_food_collectibles (
          user_id,
          food_collectible_type_id,
          acquired_poi_id
        )
        VALUES ($1, $2, $3)
        RETURNING id, acquired_at
      `,
      [userId, body.collectibleTypeId, body.poiId]
    );

    const collectible = collectibleResult.rows[0];

    await client.query(
      `
        INSERT INTO food_collectible_events (
          user_food_collectible_id,
          actor_user_id,
          to_user_id,
          event_type,
          poi_id
        )
        VALUES ($1, $2, $2, 'acquired', $3)
      `,
      [collectible.id, userId, body.poiId]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        id: collectible.id,
        acquiredAt: collectible.acquired_at,
        name: poi.name,
        points: poi.points,
        source: poi.source,
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Collectible acquisition failed:", error);

    return NextResponse.json(
      { error: "Unable to collect this item" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
