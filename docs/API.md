# API Reference

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
