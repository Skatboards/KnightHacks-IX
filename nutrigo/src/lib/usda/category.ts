export const FOOD_CATEGORIES = [
    "Fruit",
    "Vegetable",
    "Grain",
    "Protein",
    "Dairy",
    "Legume",
    "Nut/Seed",
    "Beverage",
    "Snack",
    "Other",
] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

type CategoryRule = {
    category: Exclude<FoodCategory, "Other">;
    pattern: RegExp;
};

// Rules are intentionally ordered. The first matching rule wins.
const CATEGORY_RULES: CategoryRule[] = [
    {
        category: "Dairy",
        pattern: /\b(dairy|milk|cheese|yogurt|yoghurt|cream|ice\s+cream)\b/i,
    },
    {
        category: "Protein",
        pattern:
            /\b(meat|beef|pork|lamb|veal|poultry|chicken|turkey|fish|seafood|shellfish|egg|eggs|game)\b/i,
    },
    {
        category: "Legume",
        pattern:
            /\b(legume|bean|beans|pea|peas|lentil|lentils|soy|soybean|chickpea|chickpeas)\b/i,
    },
    {
        category: "Nut/Seed",
        pattern:
            /\b(nut|nuts|seed|seeds|peanut|peanuts|almond|almonds|walnut|walnuts|cashew|cashews|pistachio|pistachios)\b/i,
    },
    {
        category: "Fruit",
        pattern: /\b(fruit|fruits|berry|berries|apple|banana|citrus|melon)\b/i,
    },
    {
        category: "Vegetable",
        pattern:
            /\b(vegetable|vegetables|potato|potatoes|tomato|tomatoes|root|greens)\b/i,
    },
    {
        category: "Grain",
        pattern:
            /\b(grain|grains|cereal|cereals|pasta|rice|bread|bakery|baked|flour|wheat|oat|oats|corn)\b/i,
    },
    {
        category: "Beverage",
        pattern:
            /\b(beverage|beverages|drink|drinks|coffee|tea|soda|water|juice|juices)\b/i,
    },
    {
        category: "Snack",
        pattern:
            /\b(snack|snacks|candy|candies|confection|confections|dessert|desserts|chip|chips|popcorn)\b/i,
    },
];

export function mapUsdaCategory(rawCategory: string | null | undefined): FoodCategory {
    if (!rawCategory?.trim()) {
        return "Other";
    }

    const rule = CATEGORY_RULES.find(({ pattern }) => pattern.test(rawCategory));
    return rule?.category ?? "Other";
}
