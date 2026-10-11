const USDA_API_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

export const USDA_DATA_TYPES = [
    "Foundation",
    "Branded",
    "Survey (FNDDS)",
    "SR Legacy",
    "Experimental",
] as const;

export type UsdaDataType = (typeof USDA_DATA_TYPES)[number];

export type UsdaCatalogFood = {
    fdcId: number;
    description?: string;
    dataType?: string;
    brandOwner?: string;
};

function getApiKey() {
    const apiKey = process.env.USDA_API_KEY;

    if (!apiKey) {
        throw new Error("USDA_API_KEY is not configured.");
    }

    return apiKey;
}

export async function fetchUsdaFoodIdPage({
    pageNumber,
    pageSize,
    dataTypes = [],
}: {
    pageNumber: number;
    pageSize: number;
    dataTypes?: UsdaDataType[];
}) {
    const url = new URL(`${USDA_API_BASE_URL}/foods/list`);
    url.searchParams.set("api_key", getApiKey());
    url.searchParams.set("pageNumber", String(pageNumber));
    url.searchParams.set("pageSize", String(pageSize));
    url.searchParams.set("format", "abridged");
    if (dataTypes.length > 0) {
        url.searchParams.set("dataType", dataTypes.join(","));
    }

    const response = await fetch(url, { cache: "no-store" });
    const responseBody = await response.text();

    if (!response.ok) {
        throw new Error(
            `USDA catalog request failed with status ${response.status}: ${responseBody.slice(0, 500)}`
        );
    }

    let data: unknown;

    try {
        data = JSON.parse(responseBody);
    } catch {
        throw new Error("USDA catalog returned invalid JSON.");
    }

    if (!Array.isArray(data)) {
        throw new Error("USDA catalog returned an invalid food list.");
    }

    const items = data.filter(
        (food): food is UsdaCatalogFood =>
            typeof food === "object" &&
            food !== null &&
            typeof (food as UsdaCatalogFood).fdcId === "number"
    );

    return {
        items,
        fdcIds: items.map((food) => food.fdcId),
    };
}
