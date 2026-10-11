import { timingSafeEqual } from "node:crypto";

export function hasValidUsdaAdminBearerToken(request: Request) {
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
