import { NextResponse } from "next/server";
import {
    findOwnedCollectibles,
    type OwnedCollectiblesCursor,
} from "@/lib/db/owned-collectibles";

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function decodeCursor(value: string): OwnedCollectiblesCursor | null {
    try {
        const cursor = JSON.parse(
            Buffer.from(value, "base64url").toString("utf8")
        ) as Partial<OwnedCollectiblesCursor>;

        if (
            typeof cursor.acquiredAt !== "string" ||
            !Number.isFinite(Date.parse(cursor.acquiredAt)) ||
            typeof cursor.id !== "string" ||
            !UUID_PATTERN.test(cursor.id)
        ) {
            return null;
        }

        return {
            acquiredAt: new Date(cursor.acquiredAt).toISOString(),
            id: cursor.id,
        };
    } catch {
        return null;
    }
}

function encodeCursor(cursor: OwnedCollectiblesCursor) {
    return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const rawLimit = searchParams.get("limit");
    const limit = rawLimit ? Number(rawLimit) : DEFAULT_BATCH_SIZE;
    const rawCursor = searchParams.get("cursor");

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BATCH_SIZE) {
        return NextResponse.json(
            { error: `limit must be an integer between 1 and ${MAX_BATCH_SIZE}.` },
            { status: 400 }
        );
    }

    let cursor: OwnedCollectiblesCursor | undefined;
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
        const collection = await findOwnedCollectibles({
            userId,
            limit,
            cursor,
        });

        return NextResponse.json({
            items: collection.items,
            pagination: {
                limit,
                hasMore: collection.hasMore,
                nextCursor: collection.nextCursor
                    ? encodeCursor(collection.nextCursor)
                    : null,
            },
        });
    } catch (error) {
        console.error("Owned collectible lookup failed:", error);
        return NextResponse.json(
            { error: "Unable to load owned collectibles." },
            { status: 503 }
        );
    }
}
