import { NextResponse } from "next/server";
import { findFoodTypes } from "@/lib/db/food-types";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const foodName = searchParams.get("name")?.trim();
    const externalId = searchParams.get("external_id")?.trim();

    if (!foodName && !externalId) {
        return NextResponse.json(
            { error: "Please provide a food name or external_id." },
            { status: 400 }
        );
    }

    try {
        const foods = await findFoodTypes({
            externalId: externalId || undefined,
            name: externalId ? undefined : foodName || undefined,
        });

        if (foods.length === 0) {
            return NextResponse.json(
                { error: "Food collectible not found." },
                { status: 404 }
            );
        }

        if (!externalId && foods.length > 1) {
            return NextResponse.json(
                {
                    error: "Food name is ambiguous; use external_id.",
                    matches: foods.map((food) => ({
                        id: food.id,
                        external_id: food.external_id,
                        food: food.name,
                    })),
                },
                { status: 409 }
            );
        }

        const food = foods[0];
        const nutritionData = food.nutrition_data;

        return NextResponse.json({
            id: food.id,
            external_id: food.external_id,
            food: food.name,
            category: food.category,
            rarity: food.rarity,
            calories: nutritionData.calories ?? null,
            serving_amount: nutritionData.serving_amount ?? null,
            serving_unit: nutritionData.serving_unit ?? null,
            nutrition_data: nutritionData,
        });
    } catch (error) {
        console.error("Food database lookup failed:", error);
        return NextResponse.json(
            { error: "Food database is unavailable." },
            { status: 503 }
        );
    }
}
