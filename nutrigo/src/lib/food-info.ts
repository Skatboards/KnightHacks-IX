export type FoodInfo = {
    id: string;
    external_id: string;
    food: string;
    category: string;
    rarity: string;
    calories: number | null;
    serving_amount: number | null;
    serving_unit: string | null;
    nutrition_data: Record<string, unknown>;
};

export default async function getFoodInfo(
    foodName: string
): Promise<FoodInfo | undefined> {
    const response = await fetch(
        `/api/foods?name=${encodeURIComponent(foodName)}`
    );

    const data = await response.json();

    if (!response.ok) {
        console.error(data.error);
        return;
    }

    return data as FoodInfo;
}
