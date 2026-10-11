import { getDbPool } from "@/lib/db/client";

export type CollectiblesScope = "owned" | "all";

export type CollectibleOwnershipStatus =
    | "owned"
    | "previously_owned"
    | "never_acquired";

export type CollectiblesCursor = {
    createdAt: string;
    id: string;
};

export type CollectibleCatalogItem = {
    id: string;
    externalId: string;
    name: string;
    description: string | null;
    category: string;
    rarity: string;
    assetKey: string | null;
    metadata: Record<string, unknown>;
    nutritionData: Record<string, unknown>;
    ownershipStatus: CollectibleOwnershipStatus;
    ownedCount: number;
};

export type CollectibleCatalogSummary = {
    total: number;
    owned: number;
    previouslyOwned: number;
    neverAcquired: number;
};

type CollectibleCatalogRow = {
    collectible_type_id: string;
    external_id: string;
    food_name: string;
    food_description: string | null;
    category: string;
    rarity: string;
    asset_key: string | null;
    type_metadata: Record<string, unknown>;
    nutrition_data: Record<string, unknown>;
    created_at: Date;
    owned_count: number;
    has_acquisition_history: boolean;
};

type CollectibleSummaryRow = {
    total: number;
    owned: number;
    previously_owned: number;
    never_acquired: number;
};

function getOwnershipStatus(
    ownedCount: number,
    hasAcquisitionHistory: boolean
): CollectibleOwnershipStatus {
    if (ownedCount > 0) {
        return "owned";
    }

    return hasAcquisitionHistory ? "previously_owned" : "never_acquired";
}

function mapCatalogItem(row: CollectibleCatalogRow): CollectibleCatalogItem {
    return {
        id: row.collectible_type_id,
        externalId: row.external_id,
        name: row.food_name,
        description: row.food_description,
        category: row.category,
        rarity: row.rarity,
        assetKey: row.asset_key,
        metadata: row.type_metadata,
        nutritionData: row.nutrition_data,
        ownershipStatus: getOwnershipStatus(
            row.owned_count,
            row.has_acquisition_history
        ),
        ownedCount: row.owned_count,
    };
}

const OWNERSHIP_CTES = `
    WITH current_ownership AS (
        SELECT
            ufc.food_collectible_type_id,
            COUNT(*)::integer AS owned_count
        FROM user_food_collectibles AS ufc
        WHERE ufc.user_id = $1
          AND ufc.status = 'active'
        GROUP BY ufc.food_collectible_type_id
    ),
    acquisition_history AS (
        SELECT DISTINCT ufc.food_collectible_type_id
        FROM food_collectible_events AS event
        JOIN user_food_collectibles AS ufc
            ON ufc.id = event.user_food_collectible_id
        WHERE event.to_user_id = $1
          AND event.event_type IN ('acquired', 'transferred')
    )
`;

export async function findCollectibleCatalog({
    userId,
    scope,
    limit,
    cursor,
}: {
    userId: string;
    scope: CollectiblesScope;
    limit: number;
    cursor?: CollectiblesCursor;
}) {
    const pool = getDbPool();
    const values: unknown[] = [userId, scope];
    let cursorClause = "";

    if (cursor) {
        values.push(cursor.createdAt, cursor.id);
        cursorClause = `
            AND (
                fct.created_at < $3::timestamptz
                OR (
                    fct.created_at = $3::timestamptz
                    AND fct.id < $4::uuid
                )
            )
        `;
    }

    const limitParameter = values.length + 1;
    values.push(limit + 1);

    const [catalogResult, summaryResult] = await Promise.all([
        pool.query<CollectibleCatalogRow>(
            `
                ${OWNERSHIP_CTES}
                SELECT
                    fct.id AS collectible_type_id,
                    fct.external_id,
                    fct.name AS food_name,
                    fct.description AS food_description,
                    fct.category,
                    fct.rarity,
                    fct.asset_key,
                    fct.metadata AS type_metadata,
                    fct.nutrition_data,
                    fct.created_at,
                    COALESCE(co.owned_count, 0)::integer AS owned_count,
                    (ah.food_collectible_type_id IS NOT NULL)
                        AS has_acquisition_history
                FROM food_collectible_types AS fct
                LEFT JOIN current_ownership AS co
                    ON co.food_collectible_type_id = fct.id
                LEFT JOIN acquisition_history AS ah
                    ON ah.food_collectible_type_id = fct.id
                WHERE fct.is_active = TRUE
                  AND ($2::text = 'all' OR co.owned_count IS NOT NULL)
                  ${cursorClause}
                ORDER BY fct.created_at DESC, fct.id DESC
                LIMIT $${limitParameter}
            `,
            values
        ),
        pool.query<CollectibleSummaryRow>(
            `
                ${OWNERSHIP_CTES}
                SELECT
                    COUNT(*)::integer AS total,
                    COUNT(*) FILTER (WHERE co.owned_count > 0)::integer AS owned,
                    COUNT(*) FILTER (
                        WHERE co.owned_count IS NULL
                          AND ah.food_collectible_type_id IS NOT NULL
                    )::integer AS previously_owned,
                    COUNT(*) FILTER (
                        WHERE co.owned_count IS NULL
                          AND ah.food_collectible_type_id IS NULL
                    )::integer AS never_acquired
                FROM food_collectible_types AS fct
                LEFT JOIN current_ownership AS co
                    ON co.food_collectible_type_id = fct.id
                LEFT JOIN acquisition_history AS ah
                    ON ah.food_collectible_type_id = fct.id
                WHERE fct.is_active = TRUE
            `,
            [userId]
        ),
    ]);

    const hasMore = catalogResult.rows.length > limit;
    const rows = hasMore
        ? catalogResult.rows.slice(0, limit)
        : catalogResult.rows;
    const summary = summaryResult.rows[0];

    if (!summary) {
        throw new Error("Collectible summary query did not return a record.");
    }

    const lastRow = rows[rows.length - 1];

    return {
        items: rows.map(mapCatalogItem),
        summary: {
            total: summary.total,
            owned: summary.owned,
            previouslyOwned: summary.previously_owned,
            neverAcquired: summary.never_acquired,
        },
        hasMore,
        nextCursor:
            hasMore && lastRow
                ? {
                      createdAt: lastRow.created_at.toISOString(),
                      id: lastRow.collectible_type_id,
                  }
                : null,
    };
}
