"use client";

import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 25;

type OwnershipStatus = "owned" | "previously_owned" | "never_acquired";

type Collectible = {
    id: string;
    name: string;
    description: string | null;
    category: string;
    rarity: string;
    ownershipStatus: OwnershipStatus;
    ownedCount: number;
};

type CollectiblesResponse = {
    groups: Record<OwnershipStatus, Collectible[]>;
    summary: {
        total: number;
        owned: number;
        previouslyOwned: number;
        neverAcquired: number;
    };
    pagination: {
        hasMore: boolean;
        nextCursor: string | null;
    };
};

const ownershipGroupOrder: OwnershipStatus[] = [
    "owned",
    "previously_owned",
    "never_acquired",
];

function flattenGroups(groups: CollectiblesResponse["groups"]) {
    return ownershipGroupOrder.flatMap((status) => groups[status] ?? []);
}

function mergeCollectibles(current: Collectible[], incoming: Collectible[]) {
    const merged = [...current];
    const indexes = new Map(merged.map((item, index) => [item.id, index]));

    for (const item of incoming) {
        const existingIndex = indexes.get(item.id);

        if (existingIndex === undefined) {
            indexes.set(item.id, merged.length);
            merged.push(item);
        } else {
            merged[existingIndex] = item;
        }
    }

    return merged;
}

function getCategoryIcon(category: string) {
    const icons: Record<string, string> = {
        fruit: "🍎",
        vegetable: "🥦",
        snack: "🥨",
        dairy: "🥛",
        protein: "🍗",
        grain: "🌾",
    };

    return icons[category.toLowerCase()] ?? "🍽️";
}

function getStatusLabel(status: OwnershipStatus) {
    if (status === "owned") return "Owned";
    if (status === "previously_owned") return "Previously owned";
    return "Not collected";
}

async function fetchCollectibles(cursor?: string) {
    const params = new URLSearchParams({
        scope: "all",
        limit: String(PAGE_SIZE),
    });

    if (cursor) params.set("cursor", cursor);

    const response = await fetch(`/api/collectibles?${params.toString()}`);
    const data = (await response.json()) as CollectiblesResponse & {
        error?: string;
    };

    if (!response.ok) {
        throw new Error(data.error ?? "Unable to load collectibles.");
    }

    return data;
}

function CollectibleCard({ item }: { item: Collectible }) {
    return (
        <article className="flex h-55 w-45 flex-col overflow-hidden rounded-3xl bg-white p-3 drop-shadow-lg">
            <div
                className="flex h-22 items-center justify-center rounded-2xl bg-lightish-pink text-5xl"
                aria-hidden="true"
            >
                {getCategoryIcon(item.category)}
            </div>

            <div className="mt-3 min-h-0 flex-1">
                <h2 className="line-clamp-2 text-sm font-bold leading-tight text-slate-800">
                    {item.name}
                </h2>
                <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-slate-500">
                    {item.rarity} · {item.category}
                </p>
            </div>

            <p className="truncate border-t border-slate-100 pt-2 text-[10px] font-semibold text-purple-600">
                {getStatusLabel(item.ownershipStatus)}
                {item.ownedCount > 1 ? ` · ${item.ownedCount} owned` : ""}
            </p>
        </article>
    );
}

export default function Dex() {
    const [items, setItems] = useState<Collectible[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        fetchCollectibles()
            .then((data) => {
                if (cancelled) return;

                setItems(flattenGroups(data.groups));
                setNextCursor(data.pagination.nextCursor);
            })
            .catch((fetchError) => {
                if (!cancelled) {
                    setError(
                        fetchError instanceof Error
                            ? fetchError.message
                            : "Unable to load collectibles."
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const loadMore = async () => {
        if (!nextCursor || loadingMore) return;

        setLoadingMore(true);
        setError(null);

        try {
            const data = await fetchCollectibles(nextCursor);
            setItems((current) =>
                mergeCollectibles(current, flattenGroups(data.groups))
            );
            setNextCursor(data.pagination.nextCursor);
        } catch (fetchError) {
            setError(
                fetchError instanceof Error
                    ? fetchError.message
                    : "Unable to load more collectibles."
            );
        } finally {
            setLoadingMore(false);
        }
    };

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return items;

        return items.filter((item) =>
            [item.name, item.category, item.rarity].some((value) =>
                value.toLowerCase().includes(query)
            )
        );
    }, [items, search]);

    return (
        <main className="min-h-screen bg-off-blue p-4">
            <div className="mb-6 flex flex-col items-center justify-center">
                <h1 className="mt-10 mb-4 text-2xl font-bold">Collectables</h1>
                <input
                    className="Search-input mb-5 w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search"
                    aria-label="Search collectibles"
                />
                {error && (
                    <p className="mb-2 text-center text-sm text-red-700">
                        {error}
                    </p>
                )}
            </div>

            <div className="mx-5 grid max-w-5xl grid-cols-2 justify-items-center gap-3">
                {loading
                    ? Array.from({ length: 6 }, (_, index) => (
                          <div
                              key={index}
                              className="h-55 w-45 animate-pulse rounded-3xl bg-white drop-shadow-lg"
                          />
                      ))
                    : filteredItems.map((item) => (
                          <CollectibleCard key={item.id} item={item} />
                      ))}
            </div>

            {!loading && filteredItems.length === 0 && (
                <p className="mt-6 text-center text-sm text-slate-600">
                    No collectibles match your search.
                </p>
            )}

            {nextCursor && !search.trim() && (
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="mt-6 rounded-3xl bg-white px-6 py-3 font-bold text-slate-700 drop-shadow-lg disabled:cursor-wait disabled:opacity-60"
                    >
                        {loadingMore ? "Loading..." : "Load more collectibles"}
                    </button>
                </div>
            )}
        </main>
    );
}
