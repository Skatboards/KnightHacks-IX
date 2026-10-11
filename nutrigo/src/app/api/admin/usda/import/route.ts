import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { importUsdaFoods } from "@/lib/usda/importer";

export const runtime = "nodejs";

function hasValidBearerToken(request: Request) {
    const configuredToken = process.env.USDA_IMPORT_ADMIN_TOKEN;
    const authorization = request.headers.get("authorization");

    if (!configuredToken || !authorization?.startsWith("Bearer ")) {
        return false;
    }

    const providedToken = authorization.slice("Bearer ".length);
    const provided = Buffer.from(providedToken);
    const expected = Buffer.from(configuredToken);

    return (
        provided.length === expected.length &&
        timingSafeEqual(provided, expected)
    );
}

export async function POST(request: Request) {
    if (!process.env.USDA_IMPORT_ADMIN_TOKEN) {
        return NextResponse.json(
            { error: "Temporary USDA import authentication is not configured." },
            { status: 503 }
        );
    }

    if (!hasValidBearerToken(request)) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const fdcIds =
        typeof body === "object" && body !== null && "fdcIds" in body
            ? (body as { fdcIds?: unknown }).fdcIds
            : undefined;

    if (
        !Array.isArray(fdcIds) ||
        fdcIds.some((fdcId) => typeof fdcId !== "number" || !Number.isInteger(fdcId))
    ) {
        return NextResponse.json(
            { error: "fdcIds must be an array of integer USDA food IDs." },
            { status: 400 }
        );
    }

    try {
        const results = await importUsdaFoods(fdcIds);
        const hasFailures = results.some((result) => result.status === "failed");

        return NextResponse.json(
            { results },
            { status: hasFailures ? 207 : 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Import failed." },
            { status: 400 }
        );
    }
}
