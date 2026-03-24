# @brandonwie/dayjs-util

Timezone-safe date utility wrapper for [dayjs](https://day.js.org/) — built for calendar applications.

## Why not just use dayjs directly?

| Concern                     | Raw dayjs                                       | This library                                               |
| --------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| **Timezone ambiguity**      | `dayjs("2025-01-01")` — UTC? Local? Seoul?      | `DayjsUtil.tzParse("2025-01-01", "Asia/Seoul")` — explicit |
| **All-day vs timed events** | No built-in distinction                         | `stripTimezoneToUTC()` vs `convertToUTCDate()`             |
| **Plugin setup**            | Must remember `extend(utc)`, `extend(timezone)` | Auto-loaded once at import                                 |
| **Return type clarity**     | Everything returns `Dayjs`                      | `*Date` → JS Date, `*String` → string, bare → Dayjs        |

## Install

```bash
pnpm add @brandonwie/dayjs-util dayjs
# or
npm install @brandonwie/dayjs-util dayjs
```

> `dayjs` is a **peer dependency** — you control the version.

## Quick Start

```typescript
import { DayjsUtil } from "@brandonwie/dayjs-util";

// Parse a date AS being in a specific timezone
const seoulMidnight = DayjsUtil.tzParse("2025-01-01 00:00:00", "Asia/Seoul");
// → Dayjs representing 2025-01-01 00:00:00 KST (2024-12-31 15:00:00 UTC)

// Convert to UTC Date for database storage
const utcDate = DayjsUtil.convertToUTCDate("2025-06-15T09:00:00+09:00");
// → Date(2025-06-15T00:00:00.000Z)

// All-day events: preserve time, strip timezone
const allDay = DayjsUtil.stripTimezoneToUTC("2025-06-15T00:00:00+09:00");
// → Date(2025-06-15T00:00:00.000Z)  ← time preserved!

// Format for API responses
DayjsUtil.formatUTCString(new Date()); // "2025-06-15T00:00:00Z"
DayjsUtil.formatISOString(new Date(), "Asia/Seoul"); // "2025-06-15T09:00:00+09:00"
```

## API Reference

### Parsing

| Method                       | Returns | Description                                           |
| ---------------------------- | ------- | ----------------------------------------------------- |
| `utc(date?)`                 | `Dayjs` | Create/convert to UTC                                 |
| `tz(date?, timezone?)`       | `Dayjs` | Convert TO timezone (same instant, different display) |
| `tzParse(str, timezone?)`    | `Dayjs` | Parse AS timezone (different instant!)                |
| `parseToTz(str?, timezone?)` | `Dayjs` | Parse string, display in timezone                     |

#### `tz()` vs `tzParse()` — the critical difference

```typescript
const str = "2025-01-01 00:00:00";

// tz(): parses in server timezone, converts display to Seoul
DayjsUtil.tz(str, "Asia/Seoul").toDate();
// → 2025-01-01T00:00:00.000Z (if server is UTC)

// tzParse(): interprets the string AS Seoul time
DayjsUtil.tzParse(str, "Asia/Seoul").toDate();
// → 2024-12-31T15:00:00.000Z (9 hours earlier!)
```

Use `tzParse()` when processing user input in their timezone. Use `tz()` when converting a known UTC instant for display.

### Conversion

| Method                     | Returns | Description                                           |
| -------------------------- | ------- | ----------------------------------------------------- |
| `convertToUTCDate(date?)`  | `Date`  | Timezone conversion → UTC. For **timed events**.      |
| `stripTimezoneToUTC(str?)` | `Date`  | Preserve time, set tz to UTC. For **all-day events**. |
| `epoch()`                  | `Date`  | Returns `1970-01-01T00:00:00Z`. Sentinel value.       |

### Formatting

| Method                             | Returns  | Description                     |
| ---------------------------------- | -------- | ------------------------------- |
| `formatISOString(date?, tz?)`      | `string` | `2025-01-01T09:00:00+09:00`     |
| `formatUTCString(date?)`           | `string` | `2025-01-01T00:00:00Z`          |
| `formatDateOnlyString(date?, tz?)` | `string` | `2025-01-01` (timezone-aware)   |
| `extractDateOnlyString(date?)`     | `string` | `2025-01-01` (no tz conversion) |

### Comparison

| Method                    | Returns   | Description                            |
| ------------------------- | --------- | -------------------------------------- |
| `isSame(d1?, d2?, unit?)` | `boolean` | Compare two dates at given granularity |
| `diff(d1?, d2?, unit?)`   | `number`  | Difference in specified unit           |

### Validation

| Method                           | Returns   | Description                                   |
| -------------------------------- | --------- | --------------------------------------------- |
| `isValidDateFormat(str, format)` | `boolean` | Validate string against `DATE_FORMAT` pattern |

#### Supported `DATE_FORMAT` constants

| Constant             | Pattern                         | Example                         |
| -------------------- | ------------------------------- | ------------------------------- |
| `DATE`               | `YYYY-MM-DD`                    | `2025-01-01`                    |
| `DATETIME`           | `YYYY-MM-DDTHH:mm:ss`           | `2025-01-01T10:00:00`           |
| `DATETIME_UTC`       | `YYYY-MM-DDTHH:mm:ssZ`          | `2025-01-01T10:00:00Z`          |
| `DATETIME_OFFSET`    | `YYYY-MM-DDTHH:mm:ss±HH:mm`     | `2025-01-01T10:00:00+09:00`     |
| `DATETIME_MS`        | `YYYY-MM-DDTHH:mm:ss.SSS`       | `2025-01-01T10:00:00.000`       |
| `DATETIME_MS_UTC`    | `YYYY-MM-DDTHH:mm:ss.SSSZ`      | `2025-01-01T10:00:00.000Z`      |
| `DATETIME_MS_OFFSET` | `YYYY-MM-DDTHH:mm:ss.SSS±HH:mm` | `2025-01-01T10:00:00.000+09:00` |

## EventDateHandler (Calendar Events)

Optional import for calendar-specific date processing:

```typescript
import { EventDateHandler } from "@brandonwie/dayjs-util";
// or: import { EventDateHandler } from '@brandonwie/dayjs-util/event';

// All-day event: strip timezone, preserve time
const allDay = EventDateHandler.processAllDayEventDates(
  "2025-06-15T00:00:00+09:00",
  "2025-06-16T00:00:00+09:00",
);
// { startAt: Date(2025-06-15T00:00:00Z), endAt: Date(2025-06-16T00:00:00Z), zone: 'UTC' }

// Timed event: convert to UTC
const timed = EventDateHandler.processTimedEventDates(
  "2025-06-15T09:00:00+09:00",
  "2025-06-15T10:00:00+09:00",
  "Asia/Seoul",
);
// { startAt: Date(2025-06-15T00:00:00Z), endAt: Date(2025-06-15T01:00:00Z), zone: 'Asia/Seoul' }

// Unified: auto-dispatch based on isAllDay flag
const [start, end, zone] = EventDateHandler.computeScheduleDates({
  startAt: "2025-06-15T09:00:00+09:00",
  endAt: "2025-06-15T10:00:00+09:00",
  timeZone: "Asia/Seoul",
  isAllDay: false,
});
```

## Migration Guide: `new Date()` → DayjsUtil

| Before                             | After                                   | Why                                 |
| ---------------------------------- | --------------------------------------- | ----------------------------------- |
| `new Date()`                       | `DayjsUtil.utc().toDate()`              | Explicit UTC, no local tz ambiguity |
| `new Date(str)`                    | `DayjsUtil.utc(str).toDate()`           | Consistent parsing                  |
| `new Date(str).toISOString()`      | `DayjsUtil.formatUTCString(str)`        | Same result, cleaner API            |
| `date.toISOString().split('T')[0]` | `DayjsUtil.extractDateOnlyString(date)` | Handles all input types             |
| `new Date(0)`                      | `DayjsUtil.epoch()`                     | Self-documenting sentinel           |
| `d1.getTime() - d2.getTime()`      | `DayjsUtil.diff(d1, d2, 'ms')`          | Readable, unit-aware                |
| Manual offset math                 | `DayjsUtil.tz(date, 'Asia/Seoul')`      | IANA timezone, DST-safe             |
| `dayjs(str).tz(tz)`                | `DayjsUtil.tzParse(str, tz)`            | Correct semantics (see above)       |

## Design Decisions

- **Static class** — no instantiation needed, dayjs instances created per-call (immutable, ~0.01ms)
- **Plugins loaded once** — utc, timezone, isSameOrAfter registered at import time
- **Peer dependency on dayjs** — consumers control the version, no duplication
- **Dual CJS/ESM** — works in Node.js, browsers, and bundlers

## License

MIT
