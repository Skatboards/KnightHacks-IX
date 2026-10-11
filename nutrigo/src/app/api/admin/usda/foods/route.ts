import { NextResponse } from "next/server";
import { hasValidUsdaAdminBearerToken } from "@/lib/usda/admin-auth";
import {
    fetchUsdaFoodIdPage,
    USDA_DATA_TYPES,
    type UsdaDataType,
} from "@/lib/usda/catalog";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
    if (!process.env.USDA_IMPORT_ADMIN_TOKEN) {
        return NextResponse.json(
            { error: "Temporary USDA import authentication is not configured." },
            { status: 503 }
        );
    }

    if (!hasValidUsdaAdminBearerToken(request)) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawPageNumber = searchParams.get("pageNumber");
    const rawPageSize = searchParams.get("pageSize");
    const pageNumber = rawPageNumber ? Number(rawPageNumber) : 1;
    const pageSize = rawPageSize ? Number(rawPageSize) : DEFAULT_PAGE_SIZE;
    const dataTypes = searchParams
        .getAll("dataType")
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
        return NextResponse.json(
            { error: "pageNumber must be a positive integer." },
            { status: 400 }
        );
    }

    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
        return NextResponse.json(
            { error: `pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}.` },
            { status: 400 }
        );
    }

    const invalidDataTypes = dataTypes.filter(
        (dataType) =>
            !USDA_DATA_TYPES.includes(dataType as (typeof USDA_DATA_TYPES)[number])
    );

    if (invalidDataTypes.length > 0) {
        return NextResponse.json(
            {
                error: "dataType contains unsupported USDA data types.",
                allowedDataTypes: USDA_DATA_TYPES,
            },
            { status: 400 }
        );
    }

    try {
        const page = await fetchUsdaFoodIdPage({
            pageNumber,
            pageSize,
            dataTypes: dataTypes as UsdaDataType[],
        });
        const hasMore = page.items.length === pageSize;

        return NextResponse.json({
            fdcIds: page.fdcIds,
            items: page.items,
            pagination: {
                pageNumber,
                pageSize,
                dataTypes,
                hasMore,
                nextPageNumber: hasMore ? pageNumber + 1 : null,
            },
        });
    } catch (error) {
        console.error("USDA catalog lookup failed:", error);
        return NextResponse.json(
            { error: "Unable to load USDA food IDs." },
            { status: 502 }
        );
    }
}
