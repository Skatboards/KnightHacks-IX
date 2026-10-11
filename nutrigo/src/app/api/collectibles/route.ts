import { NextResponse } from "next/server";
import {
    findCollectibleCatalog,
    type CollectibleCatalogItem,
    type CollectibleOwnershipStatus,
    type CollectiblesCursor,
    type CollectiblesScope,
} from "@/lib/db/collectible-catalog";

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function decodeCursor(value: string): CollectiblesCursor | null {
    try {
        const cursor = JSON.parse(
            Buffer.from(value, "base64url").toString("utf8")
        ) as Partial<CollectiblesCursor>;

        if (
            typeof cursor.createdAt !== "string" ||
            !Number.isFinite(Date.parse(cursor.createdAt)) ||
            typeof cursor.id !== "string" ||
            !UUID_PATTERN.test(cursor.id)
        ) {
            return null;
        }

        return {
            createdAt: new Date(cursor.createdAt).toISOString(),
            id: cursor.id,
        };
    } catch {
        return null;
    }
}

function encodeCursor(cursor: CollectiblesCursor) {
    return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function groupItems(items: CollectibleCatalogItem[]) {
    const groups: Record<CollectibleOwnershipStatus, CollectibleCatalogItem[]> = {
        owned: [],
        previously_owned: [],
        never_acquired: [],
    };

    for (const item of items) {
        groups[item.ownershipStatus].push(item);
    }

    return groups;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const rawLimit = searchParams.get("limit");
    const limit = rawLimit ? Number(rawLimit) : DEFAULT_BATCH_SIZE;
    const rawCursor = searchParams.get("cursor");
    const rawScope = searchParams.get("scope") ?? "owned";
    const scope: CollectiblesScope =
        rawScope === "all" || rawScope === "owned" ? rawScope : "owned";

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BATCH_SIZE) {
        return NextResponse.json(
            { error: `limit must be an integer between 1 and ${MAX_BATCH_SIZE}.` },
            { status: 400 }
        );
    }

    if (rawScope !== scope) {
        return NextResponse.json(
            { error: "scope must be either 'owned' or 'all'." },
            { status: 400 }
        );
    }

    let cursor: CollectiblesCursor | undefined;
    if (rawCursor) {
        cursor = decodeCursor(rawCursor) ?? undefined;
        if (!cursor) {
            return NextResponse.json(
                { error: "cursor is invalid." },
                { status: 400 }
            );
        }
    }

    const userId = process.env.NUTRIGO_USER_ID;
    if (!userId || !UUID_PATTERN.test(userId)) {
        return NextResponse.json(
            { error: "NUTRIGO_USER_ID is not configured with a valid user ID." },
            { status: 500 }
        );
    }

    try {
        const collection = await findCollectibleCatalog({
            userId,
            scope,
            limit,
            cursor,
        });

        return NextResponse.json({
            scope,
            groups: groupItems(collection.items),
            summary: collection.summary,
            pagination: {
                limit,
                hasMore: collection.hasMore,
                nextCursor: collection.nextCursor
                    ? encodeCursor(collection.nextCursor)
                    : null,
            },
        });
    } catch (error) {
        console.error("Collectible catalog lookup failed:", error);
        return NextResponse.json(
            { error: "Unable to load the collectible catalog." },
            { status: 503 }
        );
    }
}
