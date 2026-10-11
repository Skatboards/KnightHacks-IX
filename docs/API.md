# API Reference

## Endpoint overview

| Method | Endpoint | Purpose | Authentication |
| --- | --- | --- | --- |
| `GET` | `/api/foods` | Look up an imported food by name or external ID. | None |
| `GET` | `/api/collectibles` | Fetch the configured user's active owned collectibles in batches. | None currently |
| `GET` | `/api/admin/usda/foods` | Fetch a paginated USDA catalog page and its importable FDC IDs. | Temporary admin bearer token |
| `POST` | `/api/admin/usda/imports` | Import or update USDA food records by FDC ID. | Temporary admin bearer token |

## Foods

Look up an imported food by name or USDA external ID:

```http
GET /api/foods?name=Placeholder%20Golden%20Apple
GET /api/foods?external_id=usda:fdc:747448
```

Name lookups return `409` when multiple foods match; use `external_id` to
select an exact record. The endpoint returns `400` when neither query
parameter is provided, `404` when no food matches, and `503` when the database
is unavailable.

The response includes the internal food ID, external ID, display name,
category, rarity, calories, serving information, and nutrition data.

## Owned collectibles

Fetch the configured user's active collectibles in cursor-paginated batches:

```http
GET /api/collectibles?limit=25
```

### Query parameters

- `limit` — Optional batch size from `1` to `100`. Defaults to `25`.
- `cursor` — Optional opaque cursor returned by the previous response.

Request the next batch with the returned cursor:

```http
GET /api/collectibles?limit=25&cursor=<nextCursor>
```

### Response

```json
{
  "items": [
    {
      "id": "owned-instance-id",
      "status": "active",
      "acquiredAt": "2026-10-11T12:00:00.000Z",
      "metadata": {},
      "food": {
        "id": "food-type-id",
        "externalId": "usda:fdc:747448",
        "name": "Example Food",
        "description": "Example description",
        "category": "fruit",
        "rarity": "common",
        "nutritionData": {}
      },
      "acquiredPoi": {
        "id": "poi-id",
        "name": "Walking Collectible",
        "latitude": 28.6017,
        "longitude": -81.1992
      }
    }
  ],
  "pagination": {
    "limit": 25,
    "hasMore": true,
    "nextCursor": "opaque-cursor"
  }
}
```

The endpoint only returns records with an `active` ownership status. Until
authentication is added, the user is selected by the server-only
`NUTRIGO_USER_ID` environment variable.

## USDA food ID catalog

Fetch a paginated list of USDA food IDs for use with the admin import endpoint:

```http
GET /api/admin/usda/foods?pageNumber=1&pageSize=25&dataType=Foundation,SR%20Legacy
Authorization: Bearer <USDA_IMPORT_ADMIN_TOKEN>
```

The endpoint requires the temporary admin bearer token and a configured
`USDA_API_KEY`. `pageSize` accepts values from `1` to `100`, matching the
maximum batch size accepted by the importer. `dataType` is optional and accepts
comma-separated USDA values: `Foundation`, `Branded`, `Survey (FNDDS)`,
`SR Legacy`, and `Experimental`.

```json
{
  "fdcIds": [747448],
  "items": [
    {
      "fdcId": 747448,
      "description": "Example Food",
      "dataType": "Foundation"
    }
  ],
  "pagination": {
    "pageNumber": 1,
    "pageSize": 25,
    "dataTypes": ["Foundation", "SR Legacy"],
    "hasMore": true,
    "nextPageNumber": 2
  }
}
```

Pass the returned `fdcIds` to `POST /api/admin/usda/imports` as the `fdcIds`
array in the JSON request body.

## USDA imports

Import or update one or more USDA FoodData Central records:

```http
POST /api/admin/usda/imports
Authorization: Bearer <USDA_IMPORT_ADMIN_TOKEN>
Content-Type: application/json

{
  "fdcIds": [747448, 170379]
}
```

The endpoint validates the bearer token, fetches the requested records from
USDA, transforms their nutrition data, and upserts them into
`food_collectible_types`. Each result reports an `fdcId`, USDA external ID,
and one of these statuses:

- `created` — a new food record was inserted.
- `updated` — an existing record was refreshed.
- `failed` — the record could not be imported; the result includes an `error`.

The endpoint returns `200` when all records succeed and `207` when one or more
records fail. Invalid request data returns `400`, an invalid bearer token
returns `401`, and missing admin-token configuration returns `503`.

USDA API and network failures are returned in the per-record `error` field and
appended to the server-side `logs/usda-import-errors.log` file by default.
