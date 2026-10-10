import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const foodName = searchParams.get("food");

    if (!foodName) {
        return NextResponse.json(
            { error: "Please provide a food name." },
            { status: 400 }
        );
    }

    const apiKey = process.env.USDA_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "USDA API key is not configured." },
            { status: 500 }
        );
    }

    const url = new URL(
        "https://api.nal.usda.gov/fdc/v1/foods/search"
    );

    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", foodName);
    url.searchParams.set("pageSize", "10");
    url.searchParams.set("dataType", "Foundation");

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return NextResponse.json(
                { error: "USDA API request failed." },
                { status: 502 }
            );
        }

        const data = await response.json();
        const food = data.foods?.[0];

        if (!food) {
            return NextResponse.json(
                { error: "Food not found." },
                { status: 404 }
            );
        }

        const energy = food.foodNutrients?.find(
            (n: { nutrientName: string; unitName: string }) =>
                n.nutrientName === "Energy" &&
                n.unitName?.toLowerCase() === "kcal"
        );

        return NextResponse.json({
            food: food.description,
            calories: energy?.value ?? null,
            unit: energy?.unitName ?? null
        });
    } catch {
        return NextResponse.json(
            { error: "Failed to retrieve food data." },
            { status: 500 }
        );
    }
}