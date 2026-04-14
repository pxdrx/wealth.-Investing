# Apify Actor: pintostudio/economic-calendar-data-investing-com

## Pricing
- Model: PAY_PER_EVENT
- Cost: **$0.01 per result** (per event row in dataset)

## Input Schema

All parameters are **optional**. No required fields.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `timeZone` | string | local GMT | GMT offset, e.g. `"GMT +2:00"` |
| `timeFilter` | enum: `"time_only"` \| `"time_remain"` | `"time_only"` | Show event time or countdown |
| `importances` | enum: `"high"` \| `"medium"` \| `"low"` | `""` (all) | Single importance level. Empty = all including holidays |
| `categories` | string | `""` (all) | Category filter (e.g. inflation, employment, GDP) |
| `country` | enum (see list below) | `""` (all) | Single country, **lowercase full name** |
| `fromDate` | string | today | `"YYYY-MM-DD"` format |
| `toDate` | string | today | `"YYYY-MM-DD"` format |

### Country Values (exact enum)
```
spain, united states, united kingdom, germany, france, italy, netherlands,
belgium, portugal, austria, switzerland, norway, sweden, denmark, finland,
poland, czech republic, hungary, greece, turkey, russia, china, japan,
south korea, india, australia, canada, brazil, mexico, argentina, chile,
colombia, peru, south africa, israel, saudi arabia, united arab emirates,
malaysia, singapore, thailand, indonesia, philippines, vietnam, taiwan,
hong kong, new zealand
```

**NOTE:** Countries use **lowercase full English names**, not ISO codes.

## Output Schema (per event)

```typescript
interface InvestingComCalendarEvent {
  id: string;            // unique event ID
  date: string;          // event date
  time: string;          // event time or time remaining
  zone: string;          // timezone zone
  event: string;         // event name/title
  currency: string | null; // associated currency (e.g. "USD")
  importance: string | null; // "high", "medium", "low", or null
  actual: string | null; // reported/actual value
  forecast: string | null; // forecasted value
  previous: string | null; // previous period value
  data_type: string;     // type classification
  retrieved_at: string;  // ISO timestamp of scrape
}
```

## Limitations

- `importances` is a **single string**, not an array. To get high+medium, you'd need 2 runs or use empty (all).
- `country` is also a **single value**. For multiple countries, run the actor multiple times or leave empty.
- No `eurozone` or `EU` aggregate — you'd need individual countries.

## Example Input

```json
{
  "timeZone": "GMT -3:00",
  "timeFilter": "time_only",
  "importances": "high",
  "country": "united states",
  "fromDate": "2026-03-23",
  "toDate": "2026-03-28"
}
```
