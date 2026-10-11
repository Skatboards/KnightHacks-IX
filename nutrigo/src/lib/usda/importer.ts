import { getDbPool, type DbQuery } from "@/lib/db/client";
import { mapUsdaCategory, type FoodCategory } from "@/lib/usda/category";

const USDA_API_BASE_URL = "https://api.nal.usda.gov/fdc/v1";
const USDA_BATCH_SIZE = 20;

type UsdaNutrient = {
    nutrientName?: string;
    unitName?: string;
    nutrientNumber?: number | string;
    value?: number;
    amount?: number;
    nutrient?: {
        name?: string;
        unitName?: string;
        number?: number | string;
    };
};

type UsdaFood = {
    fdcId: number;
    dataType?: string;
    description: string;
    foodNutrients?: UsdaNutrient[];
    foodCategory?: {
        description?: string;
    };
    brandedFoodCategory?: string;
    wweiaFoodCategory?: {
        wweiaFoodCategoryDescription?: string;
    };
    servingSize?: number;
    servingSizeUnit?: string;
    householdServingFullText?: string;
};

type UsdaFoodsResponse = UsdaFood[];

type NutritionData = {
    calories: number;
    serving_amount: number;
    serving_unit: string;
    basis: "per_100g";
    [key: string]: number | string;
};

type ImportedFood = {
    externalId: string;
    name: string;
    description: string;
    category: FoodCategory;
    nutritionData: NutritionData;
    metadata: Record<string, number | string | null>;
};

export type ImportStatus = "created" | "updated" | "failed";

export type ImportResult = {
    fdcId: number;
    externalId: string;
    status: ImportStatus;
    id?: string;
    error?: string;
};

function getApiKey() {
    const apiKey = process.env.USDA_API_KEY;

    if (!apiKey) {
        throw new Error("USDA_API_KEY is not configured.");
    }

    return apiKey;
}

function chunks<T>(items: T[], size: number) {
    const result: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
        result.push(items.slice(index, index + size));
    }

    return result;
}

function getNutrientName(nutrient: UsdaNutrient) {
    return nutrient.nutrientName ?? nutrient.nutrient?.name ?? "";
}

function getNutrientUnit(nutrient: UsdaNutrient) {
    return nutrient.unitName ?? nutrient.nutrient?.unitName ?? "";
}

function getNutrientValue(nutrient: UsdaNutrient) {
    const value = nutrient.value ?? nutrient.amount;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function findNutrient(
    nutrients: UsdaNutrient[] | undefined,
    names: RegExp,
    unit?: string
) {
    return nutrients?.find((nutrient) => {
        const nutrientNameMatches = names.test(getNutrientName(nutrient));
        const unitMatches = unit
            ? getNutrientUnit(nutrient).toLowerCase() === unit.toLowerCase()
            : true;

        return nutrientNameMatches && unitMatches && getNutrientValue(nutrient) !== null;
    });
}

function getCalories(nutrients: UsdaNutrient[] | undefined) {
    const energy = findNutrient(nutrients, /energy/i, "kcal");
    return energy ? getNutrientValue(energy) : null;
}

function getOptionalNutrient(
    nutrients: UsdaNutrient[] | undefined,
    names: RegExp,
    key: string
) {
    const nutrient = findNutrient(nutrients, names);
    const value = nutrient ? getNutrientValue(nutrient) : null;

    return value === null ? {} : { [key]: value };
}

function getRawCategory(food: UsdaFood) {
    return (
        food.foodCategory?.description ??
        food.brandedFoodCategory ??
        food.wweiaFoodCategory?.wweiaFoodCategoryDescription ??
        null
    );
}

export function transformUsdaFood(food: UsdaFood): ImportedFood {
    const calories = getCalories(food.foodNutrients);

    if (calories === null) {
        throw new Error("USDA food does not contain a kcal energy value.");
    }

    const rawCategory = getRawCategory(food);
    const name = food.description.trim();

    if (!name) {
        throw new Error("USDA food has an empty description.");
    }

    return {
        externalId: `usda:fdc:${food.fdcId}`,
        name,
        description: name,
        category: mapUsdaCategory(rawCategory),
        nutritionData: {
            calories,
            serving_amount: 100,
            serving_unit: "g",
            basis: "per_100g",
            ...getOptionalNutrient(food.foodNutrients, /protein/i, "protein_g"),
            ...getOptionalNutrient(
                food.foodNutrients,
                /total lipid|total fat|fat, total/i,
                "fat_g"
            ),
            ...getOptionalNutrient(
                food.foodNutrients,
                /carbohydrate, by difference|carbohydrate/i,
                "carbohydrates_g"
            ),
            ...getOptionalNutrient(food.foodNutrients, /fiber/i, "fiber_g"),
            ...getOptionalNutrient(food.foodNutrients, /sugars/i, "sugars_g"),
            ...getOptionalNutrient(food.foodNutrients, /sodium/i, "sodium_mg"),
            ...getOptionalNutrient(
                food.foodNutrients,
                /cholesterol/i,
                "cholesterol_mg"
            ),
        },
        metadata: {
            source: "USDA FoodData Central",
            source_id: food.fdcId,
            data_type: food.dataType ?? null,
            usda_category: rawCategory,
            imported_at: new Date().toISOString(),
            source_serving_amount: food.servingSize ?? null,
            source_serving_unit: food.servingSizeUnit ?? null,
            source_household_serving: food.householdServingFullText ?? null,
        },
    };
}

async function fetchUsdaBatch(fdcIds: number[]) {
    const url = new URL(`${USDA_API_BASE_URL}/foods`);
    url.searchParams.set("api_key", getApiKey());

    const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fdcIds, format: "full" }),
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`USDA API request failed with status ${response.status}.`);
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
        throw new Error("USDA API returned an invalid food list.");
    }

    return data as UsdaFoodsResponse;
}

function validateFdcIds(fdcIds: number[]) {
    const uniqueIds = [...new Set(fdcIds)];

    if (
        uniqueIds.length === 0 ||
        uniqueIds.length > 100 ||
        uniqueIds.some((fdcId) => !Number.isInteger(fdcId) || fdcId <= 0)
    ) {
        throw new Error("fdcIds must contain 1 to 100 positive integer IDs.");
    }

    return uniqueIds;
}

async function upsertFood(food: ImportedFood, query: DbQuery) {
    const result = await query<{ id: string; inserted: boolean }>(
        `
            INSERT INTO food_collectible_types (
                external_id,
                name,
                description,
                category,
                rarity,
                nutrition_data,
                metadata
            )
            VALUES ($1, $2, $3, $4, 'none', $5::jsonb, $6::jsonb)
            ON CONFLICT (external_id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                category = EXCLUDED.category,
                nutrition_data = EXCLUDED.nutrition_data,
                metadata = EXCLUDED.metadata,
                updated_at = now()
            RETURNING id, (xmax = 0) AS inserted
        `,
        [
            food.externalId,
            food.name,
            food.description,
            food.category,
            JSON.stringify(food.nutritionData),
            JSON.stringify(food.metadata),
        ]
    );

    const row = result.rows[0];

    if (!row) {
        throw new Error("Food upsert did not return a record.");
    }

    return row;
}

export async function importUsdaFoods(
    requestedFdcIds: number[],
    query?: DbQuery
): Promise<ImportResult[]> {
    const fdcIds = validateFdcIds(requestedFdcIds);
    const dbQuery = query ?? getDbPool().query.bind(getDbPool());
    const results = new Map<number, ImportResult>();

    for (const batch of chunks(fdcIds, USDA_BATCH_SIZE)) {
        let foods: UsdaFoodsResponse;

        try {
            foods = await fetchUsdaBatch(batch);
        } catch (error) {
            const message = error instanceof Error ? error.message : "USDA request failed.";

            for (const fdcId of batch) {
                results.set(fdcId, {
                    fdcId,
                    externalId: `usda:fdc:${fdcId}`,
                    status: "failed",
                    error: message,
                });
            }

            continue;
        }

        const foodsById = new Map(foods.map((food) => [food.fdcId, food]));

        for (const fdcId of batch) {
            const food = foodsById.get(fdcId);
            const externalId = `usda:fdc:${fdcId}`;

            if (!food) {
                results.set(fdcId, {
                    fdcId,
                    externalId,
                    status: "failed",
                    error: "USDA food was not found.",
                });
                continue;
            }

            try {
                const importedFood = transformUsdaFood(food);
                const upserted = await upsertFood(importedFood, dbQuery);

                results.set(fdcId, {
                    fdcId,
                    externalId,
                    id: upserted.id,
                    status: upserted.inserted ? "created" : "updated",
                });
            } catch (error) {
                results.set(fdcId, {
                    fdcId,
                    externalId,
                    status: "failed",
                    error: error instanceof Error ? error.message : "Import failed.",
                });
            }
        }
    }

    return fdcIds.map((fdcId) => results.get(fdcId)!);
}
