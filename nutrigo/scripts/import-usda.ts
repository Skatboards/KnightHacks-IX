import { loadEnvConfig } from "@next/env";
import { closeDbPool } from "@/lib/db/client";
import { importUsdaFoods } from "@/lib/usda/importer";

loadEnvConfig(process.cwd());

function parseFdcIds(args: string[]) {
    const ids: number[] = [];

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];

        if (arg === "--fdc-id") {
            const value = args[index + 1];

            if (!value) {
                throw new Error("--fdc-id requires a value.");
            }

            ids.push(Number(value));
            index += 1;
            continue;
        }

        if (arg.startsWith("--fdc-id=")) {
            ids.push(Number(arg.slice("--fdc-id=".length)));
            continue;
        }

        throw new Error(`Unknown argument: ${arg}`);
    }

    return ids;
}

async function main() {
    const fdcIds = parseFdcIds(process.argv.slice(2));
    const results = await importUsdaFoods(fdcIds);

    console.log(JSON.stringify({ results }, null, 2));

    if (results.some((result) => result.status === "failed")) {
        process.exitCode = 1;
    }
}

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await closeDbPool();
    });
