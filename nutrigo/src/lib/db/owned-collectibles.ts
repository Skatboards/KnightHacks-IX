import { getDbPool } from "@/lib/db/client";

export type OwnedCollectible = {
    id: string;
    status: string;
    acquiredAt: string;
    metadata: Record<string, unknown>;
    food: {
        id: string;
        externalId: string;
        name: string;
        description: string | null;
        category: string;
        rarity: string;
        nutritionData: Record<string, unknown>;
    };
    acquiredPoi: {
        id: string;
        name: string;
        latitude: number;
        longitude: number;
    };
};

export type OwnedCollectiblesCursor = {
    acquiredAt: string;
    id: string;
};

type OwnedCollectibleRow = {
    collectible_id: string;
    status: string;
    acquired_at: Date;
    collectible_metadata: Record<string, unknown>;
    food_type_id: string;
    external_id: string;
    food_name: string;
    food_description: string | null;
    category: string;
    rarity: string;
    nutrition_data: Record<string, unknown>;
    poi_id: string;
    poi_name: string;
    poi_latitude: number;
    poi_longitude: number;
};

export async function findOwnedCollectibles({
    userId,
    limit,
    cursor,
}: {
    userId: string;
    limit: number;
    cursor?: OwnedCollectiblesCursor;
}) {
    const values: unknown[] = [userId];
    let cursorClause = "";

    if (cursor) {
        values.push(cursor.acquiredAt, cursor.id);
        cursorClause = `
            AND (
                ufc.acquired_at < $2::timestamptz
                OR (
                    ufc.acquired_at = $2::timestamptz
                    AND ufc.id < $3::uuid
                )
            )
        `;
    }

    const limitParameter = values.length + 1;
    values.push(limit + 1);

    const result = await getDbPool().query<OwnedCollectibleRow>(
        `
            SELECT
                ufc.id AS collectible_id,
                ufc.status,
                ufc.acquired_at,
                ufc.metadata AS collectible_metadata,
                fct.id AS food_type_id,
                fct.external_id,
                fct.name AS food_name,
                fct.description AS food_description,
                fct.category,
                fct.rarity,
                fct.nutrition_data,
                p.id AS poi_id,
                p.name AS poi_name,
                ST_Y(p.location::geometry) AS poi_latitude,
                ST_X(p.location::geometry) AS poi_longitude
            FROM user_food_collectibles AS ufc
            JOIN users AS u
                ON u.id = ufc.user_id
                AND u.status = 'active'
            JOIN food_collectible_types AS fct
                ON fct.id = ufc.food_collectible_type_id
            JOIN pois AS p
                ON p.id = ufc.acquired_poi_id
            WHERE ufc.user_id = $1
                AND ufc.status = 'active'
                ${cursorClause}
            ORDER BY ufc.acquired_at DESC, ufc.id DESC
            LIMIT $${limitParameter}
        `,
        values
    );

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

    return {
        items: rows.map<OwnedCollectible>((row) => ({
            id: row.collectible_id,
            status: row.status,
            acquiredAt: row.acquired_at.toISOString(),
            metadata: row.collectible_metadata,
            food: {
                id: row.food_type_id,
                externalId: row.external_id,
                name: row.food_name,
                description: row.food_description,
                category: row.category,
                rarity: row.rarity,
                nutritionData: row.nutrition_data,
            },
            acquiredPoi: {
                id: row.poi_id,
                name: row.poi_name,
                latitude: row.poi_latitude,
                longitude: row.poi_longitude,
            },
        })),
        hasMore,
        nextCursor: hasMore
            ? {
                  acquiredAt: rows[rows.length - 1].acquired_at.toISOString(),
                  id: rows[rows.length - 1].collectible_id,
              }
            : null,
    };
}
