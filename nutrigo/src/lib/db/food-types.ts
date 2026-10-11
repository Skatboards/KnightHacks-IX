import { getDbPool } from "@/lib/db/client";

export type FoodNutritionData = {
    calories?: number;
    serving_amount?: number;
    serving_unit?: string;
    [key: string]: unknown;
};

export type FoodTypeRecord = {
    id: string;
    external_id: string;
    name: string;
    category: string;
    rarity: string;
    nutrition_data: FoodNutritionData;
};

export async function findFoodTypes({
    externalId,
    name,
}: {
    externalId?: string;
    name?: string;
}) {
    const pool = getDbPool();

    if (externalId) {
        const result = await pool.query<FoodTypeRecord>(
            `
                SELECT id, external_id, name, category, rarity, nutrition_data
                FROM food_collectible_types
                WHERE is_active = TRUE AND external_id = $1
                LIMIT 1
            `,
            [externalId]
        );

        return result.rows;
    }

    if (name) {
        const result = await pool.query<FoodTypeRecord>(
            `
                SELECT id, external_id, name, category, rarity, nutrition_data
                FROM food_collectible_types
                WHERE is_active = TRUE AND lower(name) = lower($1)
                ORDER BY name, external_id
                LIMIT 2
            `,
            [name]
        );

        return result.rows;
    }

    return [];
}
