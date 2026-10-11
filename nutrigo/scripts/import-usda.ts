import { loadEnvConfig } from "@next/env";
import { closeDbPool } from "@/lib/db/client";
import { fetchUsdaFoodIdPage } from "@/lib/usda/catalog";
import { importUsdaFoods } from "@/lib/usda/importer";

loadEnvConfig(process.cwd());

const PAGE_SIZE = 100;

async function main() {
    let pageNumber = 1;
    let pagesProcessed = 0;
    let imported = 0;
    let failed = 0;

    while (true) {
        const page = await fetchUsdaFoodIdPage({
            pageNumber,
            pageSize: PAGE_SIZE,
        });

        if (page.fdcIds.length === 0) {
            break;
        }

        const results = await importUsdaFoods(page.fdcIds);
        const pageFailures = results.filter(
            (result) => result.status === "failed"
        );

        imported += results.length - pageFailures.length;
        failed += pageFailures.length;
        pagesProcessed += 1;

        console.log(
            JSON.stringify(
                {
                    pageNumber,
                    requested: page.fdcIds.length,
                    imported: results.length - pageFailures.length,
                    failed: pageFailures.length,
                    failures: pageFailures,
                },
                null,
                2
            )
        );

        if (page.fdcIds.length < PAGE_SIZE) {
            break;
        }

        pageNumber += 1;
    }

    console.log(
        JSON.stringify(
            {
                pagesProcessed,
                imported,
                failed,
            },
            null,
            2
        )
    );

    if (failed > 0) {
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
