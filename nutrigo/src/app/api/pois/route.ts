import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createDemoPoi, getDemoPois } from "@/lib/demo-store";

type PoiRequest = {
  latitude: number;
  longitude: number;
  source?: "step_path";
  name?: string;
};

const HARD_CODED_POIS = [
  { name: "UCF Library", latitude: 28.6017, longitude: -81.1992, points: 500 },
  { name: "RWC", latitude: 28.6015, longitude: -81.2024, points: 500 },
  { name: "Lake Claire", latitude: 28.5947, longitude: -81.2017, points: 500 },
  { name: "Student Union", latitude: 28.6024, longitude: -81.2005, points: 500 },
  { name: "Neptune Dorms", latitude: 28.5962, longitude: -81.2081, points: 500 },
] as const;

function isCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function POST(request: Request) {
  let body: PoiRequest;

  try {
    body = (await request.json()) as PoiRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (
    !isCoordinate(body.latitude) ||
    !isCoordinate(body.longitude) ||
    body.latitude < -90 ||
    body.latitude > 90 ||
    body.longitude < -180 ||
    body.longitude > 180
  ) {
    return NextResponse.json(
      { error: "Valid latitude and longitude are required" },
      { status: 400 }
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      createDemoPoi({
        name: body.name ?? "Step Path Collectible",
        points: 150,
        latitude: body.latitude,
        longitude: body.longitude,
        source: "step_path",
      }),
      { status: 201 }
    );
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const typeResult = await client.query<{ id: string }>(
      `
        SELECT id
        FROM food_collectible_types
        WHERE name = 'Golden Apple'
          AND is_active = TRUE
        ORDER BY created_at
        LIMIT 1
      `
    );

    let collectibleTypeId = typeResult.rows[0]?.id;

    if (!collectibleTypeId) {
      const createdType = await client.query<{ id: string }>(
        `
            INSERT INTO food_collectible_types (
                name,
                description,
                category,
                rarity,
                asset_key,
                nutrition_data
            )
            VALUES (
                'Golden Apple',
                'A collectible earned by completing a walking route.',
                'fruit',
                'common',
                'golden-apple',
                '{"calories": 95, "serving_unit": "piece"}'::jsonb
            )
          RETURNING id
        `
      );
      collectibleTypeId = createdType.rows[0].id;
    }

    const poiResult = await client.query<{ id: string }>(
      `
        INSERT INTO pois (name, poi_type, description, location, metadata)
        VALUES (
          $3,
          'food_collectible',
          'A collectible generated from the player step-count route.',
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          jsonb_build_object('source', 'step_path', 'points', 150)
        )
        RETURNING id
      `,
      [body.longitude, body.latitude, body.name ?? "Step Path Collectible"]
    );

    const poiId = poiResult.rows[0].id;

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

    await client.query("COMMIT");

    return NextResponse.json(
      {
        poiId,
        collectibleTypeId,
        name: body.name ?? "Step Path Collectible",
        points: 150,
        source: "step_path",
        latitude: body.latitude,
        longitude: body.longitude,
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POI creation failed:", error);
    return NextResponse.json({ error: "Unable to create POI" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    const existing = getDemoPois().filter((poi) => poi.source === "hard_coded");
    const fixedPois =
      existing.length === HARD_CODED_POIS.length
        ? existing
        : HARD_CODED_POIS.map((poi) =>
            createDemoPoi({
              ...poi,
              source: "hard_coded",
            })
          );

    return NextResponse.json({ pois: fixedPois });
  }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const typeResult = await client.query<{ id: string }>(
        `
          SELECT id
          FROM food_collectible_types
          WHERE name = 'Golden Apple'
            AND is_active = TRUE
          ORDER BY created_at
          LIMIT 1
        `
      );

      let collectibleTypeId = typeResult.rows[0]?.id;
      if (!collectibleTypeId) {
        const createdType = await client.query<{ id: string }>(
          `
            INSERT INTO food_collectible_types (
              name, description, category, rarity, asset_key, nutrition_data
            )
            VALUES (
              'Golden Apple',
              'A collectible found while walking.',
              'fruit',
              'common',
              'golden-apple',
              '{"calories": 95, "serving_unit": "piece"}'::jsonb
            )
            RETURNING id
          `
        );
        collectibleTypeId = createdType.rows[0].id;
      }

      const pois = [];
      for (const fixedPoi of HARD_CODED_POIS) {
        const existingPoi = await client.query<{ id: string }>(
          `SELECT id FROM pois WHERE name = $1 AND is_active = TRUE ORDER BY created_at LIMIT 1`,
          [fixedPoi.name]
        );

        const result = existingPoi.rows[0]
          ? { rows: existingPoi.rows }
          : await client.query<{ id: string }>(
          `
            INSERT INTO pois (name, poi_type, description, location, metadata)
            VALUES (
              $1,
              'Hard-coded Collectible',
              'A permanent high-value campus collectible.',
              ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
              jsonb_build_object('source', 'hard_coded', 'points', $4)
            )
            ON CONFLICT DO NOTHING
            RETURNING id
          `,
          [
            fixedPoi.name,
            fixedPoi.longitude,
            fixedPoi.latitude,
            fixedPoi.points,
          ]
        );

        const poiId =
          result.rows[0]?.id ??
          (
            await client.query<{ id: string }>(
              `SELECT id FROM pois WHERE name = $1 AND is_active = TRUE ORDER BY created_at LIMIT 1`,
              [fixedPoi.name]
            )
          ).rows[0]?.id;

        if (!poiId) {
          throw new Error(`Unable to seed ${fixedPoi.name}`);
        }

        await client.query(
          `
            INSERT INTO food_collectible_appearances (poi_id, food_collectible_type_id)
            SELECT $1, $2
            WHERE NOT EXISTS (
              SELECT 1
              FROM food_collectible_appearances
              WHERE poi_id = $1 AND food_collectible_type_id = $2
            )
          `,
          [poiId, collectibleTypeId]
        );

        pois.push({
          poiId,
          collectibleTypeId,
          ...fixedPoi,
          source: "hard_coded",
        });
      }

      await client.query("COMMIT");
      return NextResponse.json({ pois });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Hard-coded POI loading failed:", error);
      return NextResponse.json({ error: "Unable to load hard-coded POIs" }, { status: 500 });
    } finally {
      client.release();
    }
}
