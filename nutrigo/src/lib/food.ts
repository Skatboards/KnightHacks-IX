export default async function getCalories(foodName: string) {
    const response = await fetch(
        `/api/food-info?food=${encodeURIComponent(foodName)}`
    );

    const data = await response.json();

    if (!response.ok) {
        console.error(data.error);
        return;
    }

    console.log("Food:", data.food);
    console.log("Calories:", data.calories);
}