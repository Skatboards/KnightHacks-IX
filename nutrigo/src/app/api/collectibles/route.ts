import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { db } from "@/lib/db";

type CollectibleRequest = {
  latitude: number;
  longitude: number;
  targetLatitude: number;
  targetLongitude: number;
};

const MAX_COLLECTION_DISTANCE_METERS = 100;

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

async function findOrCreateCollectibleType(client: PoolClient) {
  const result = await client.query<{ id: string }>(
    `
      SELECT id
      FROM food_collectible_types
      WHERE name = 'Golden Apple'
        AND is_active = TRUE
      ORDER BY created_at
      LIMIT 1
    `
  );

  if (result.rows[0]) {
    return result.rows[0].id;
  }

  const created = await client.query<{ id: string }>(
    `
      INSERT INTO food_collectible_types (
        name,
        description,
        category,
        rarity,
        nutrition_data
      )
      VALUES (
        'Golden Apple',
        'A collectible earned by completing a walking route.',
        'fruit',
        'common',
        '{"calories": 95, "serving_unit": "piece"}'::jsonb
      )
      RETURNING id
    `
  );

  return created.rows[0].id;
}

async function createPoi(
  client: PoolClient,
  latitude: number,
  longitude: number
) {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO pois (name, poi_type, description, location)
      VALUES (
        'Golden Apple',
        'food_collectible',
        'A Golden Apple walking collectible.',
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      )
      RETURNING id
    `,
    [longitude, latitude]
  );

  return result.rows[0].id;
}

export async function POST(request: Request) {
  let body: CollectibleRequest;

  try {
    body = (await request.json()) as CollectibleRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const coordinates = [
    body.latitude,
    body.longitude,
    body.targetLatitude,
    body.targetLongitude,
  ];

  if (!coordinates.every(isCoordinate)) {
    return NextResponse.json(
      { error: "Valid current and target coordinates are required" },
      { status: 400 }
    );
  }

  const distance = distanceInMeters(
    body.latitude,
    body.longitude,
    body.targetLatitude,
    body.targetLongitude
  );

  if (distance > MAX_COLLECTION_DISTANCE_METERS) {
    return NextResponse.json(
      {
        error: `Move within ${MAX_COLLECTION_DISTANCE_METERS} meters to collect this item.`,
      },
      { status: 400 }
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

    const collectibleTypeId = await findOrCreateCollectibleType(client);
    const poiId = await createPoi(
      client,
      body.targetLatitude,
      body.targetLongitude
    );

    await client.query(
      `
        INSERT INTO food_collectible_appearances (
          poi_id,
          food_collectible_type_id
        )
        VALUES ($1, $2)
      `,
      [poiId, collectibleTypeId]
    );

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
      [userId, collectibleTypeId, poiId]
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
      [collectible.id, userId, poiId]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        id: collectible.id,
        acquiredAt: collectible.acquired_at,
        name: "Golden Apple",
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
