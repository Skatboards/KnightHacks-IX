import { Pool, type QueryResultRow } from "pg";

declare global {
    var nutrigoDbPool: Pool | undefined;
}

function getDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not configured.");
    }

    return databaseUrl;
}

export function getDbPool() {
    if (!globalThis.nutrigoDbPool) {
        globalThis.nutrigoDbPool = new Pool({
            connectionString: getDatabaseUrl(),
            max: Number(process.env.DATABASE_POOL_MAX ?? 10),
            ssl:
                process.env.DATABASE_SSL === "true"
                    ? { rejectUnauthorized: false }
                    : undefined,
        });
    }

    return globalThis.nutrigoDbPool;
}

export async function closeDbPool() {
    if (globalThis.nutrigoDbPool) {
        await globalThis.nutrigoDbPool.end();
        globalThis.nutrigoDbPool = undefined;
    }
}

export type DbQuery = <Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
) => Promise<{ rows: Row[] }>;
