# @brandonwie/dayjs-util

[![npm version](https://img.shields.io/npm/v/@brandonwie/dayjs-util.svg)](https://www.npmjs.com/package/@brandonwie/dayjs-util)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@brandonwie/dayjs-util)](https://bundlephobia.com/package/@brandonwie/dayjs-util)

**English** | [한국어](./README.ko.md)

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

## Table of Contents

- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Parsing](#parsing)
  - [Current Time](#current-time)
  - [Conversion](#conversion)
  - [Arithmetic](#arithmetic)
  - [Boundaries](#boundaries)
  - [Formatting](#formatting)
  - [Timestamps](#timestamps)
  - [Duration](#duration)
  - [Comparison](#comparison)
  - [Time Manipulation](#time-manipulation)
  - [Calendar Domain](#calendar-domain)
  - [Validation](#validation)
- [EventDateHandler](#eventdatehandler-calendar-events)
  - [toAllDayUTC](#toalldayutcstart-end) | [toTimedUTC](#totimedutcstart-end-timezone) | [normalize](#normalizeparams)
- [Migration Guide](#migration-guide-new-date--dayjsutil)
- [Design Decisions](#design-decisions)
- [How DST is Handled](#how-dst-is-handled)
- [Breaking Changes in v0.4.0](#breaking-changes-in-v040)
- [References](#references)
- [License](#license)

## Quick Start

```typescript
import { DayjsUtil } from "@brandonwie/dayjs-util";

// Current time in any timezone
const now = DayjsUtil.now("America/New_York");

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

```typescript
// utc(): create a Dayjs object in UTC
DayjsUtil.utc("2025-06-15T09:00:00+09:00");
// → Dayjs representing 2025-06-15T00:00:00Z

DayjsUtil.utc(); // current time in UTC

// parseToTz(): parse a string and display in timezone
DayjsUtil.parseToTz("2025-06-15T00:00:00Z", "Asia/Seoul");
// → Dayjs displaying as 2025-06-15T09:00:00+09:00
```

### Current Time

| Method           | Returns | Description                              |
| ---------------- | ------- | ---------------------------------------- |
| `now(timezone?)` | `Dayjs` | Current moment in the specified timezone |

```typescript
DayjsUtil.now(); // current time in UTC
DayjsUtil.now("Asia/Seoul"); // current time in Seoul
DayjsUtil.now("America/New_York"); // current time in New York
```

### Conversion

| Method                     | Returns | Description                                           |
| -------------------------- | ------- | ----------------------------------------------------- |
| `convertToUTCDate(date?)`  | `Date`  | Timezone conversion → UTC. For **timed events**.      |
| `stripTimezoneToUTC(str?)` | `Date`  | Preserve time, set tz to UTC. For **all-day events**. |
| `epoch()`                  | `Date`  | Returns `1970-01-01T00:00:00Z`. Sentinel value.       |

```typescript
// convertToUTCDate: proper timezone conversion
DayjsUtil.convertToUTCDate("2025-06-15T15:00:00+09:00");
// → Date(2025-06-15T06:00:00.000Z)

// stripTimezoneToUTC: keep the wall-clock time, force UTC
DayjsUtil.stripTimezoneToUTC("2025-06-15T00:00:00+09:00");
// → Date(2025-06-15T00:00:00.000Z)  ← time preserved, offset discarded

// epoch: sentinel value for "not applicable" states
DayjsUtil.epoch();
// → Date(1970-01-01T00:00:00.000Z)
```

### Arithmetic

| Method                                   | Returns | Description                          |
| ---------------------------------------- | ------- | ------------------------------------ |
| `add(date, value, unit, timezone?)`      | `Dayjs` | Add time to a date (DST-safe)        |
| `subtract(date, value, unit, timezone?)` | `Dayjs` | Subtract time from a date (DST-safe) |

> **DST-safe**: Adding 1 day across a DST boundary yields the same wall-clock
> time the next day, not exactly 24 hours later. Operations are performed in
> the specified timezone to ensure correctness.

```typescript
// Add days
DayjsUtil.add("2025-06-15T09:00:00Z", 3, "day");
// → 2025-06-18T09:00:00Z

// Month-end auto-clamp: Jan 31 + 1 month = Feb 28 (not Mar 3)
DayjsUtil.add("2025-01-31T00:00:00Z", 1, "month");
// → 2025-02-28T00:00:00Z

// Subtract with timezone
DayjsUtil.subtract("2025-06-15T09:00:00Z", 2, "hour", "Asia/Seoul");
// → Dayjs representing 2025-06-15T16:00:00 KST (was 18:00 KST)

// Add hours
DayjsUtil.add("2025-06-15T09:00:00Z", 5, "hour");
// → 2025-06-15T14:00:00Z
```

### Boundaries

| Method                               | Returns | Description                    |
| ------------------------------------ | ------- | ------------------------------ |
| `startOf(date, unit, timezone?)`     | `Dayjs` | Start of time unit in timezone |
| `endOf(date, unit, timezone?)`       | `Dayjs` | End of time unit in timezone   |
| `startOfDate(date, unit, timezone?)` | `Date`  | Start of time unit as JS Date  |
| `endOfDate(date, unit, timezone?)`   | `Date`  | End of time unit as JS Date    |

> **Timezone matters**: `startOf("day")` computes midnight in the specified
> timezone, not UTC midnight. This prevents the common bug where a Seoul user
> sees events from the wrong day.

```typescript
// Midnight in Seoul (not UTC midnight!)
DayjsUtil.startOf("2025-06-15T02:00:00Z", "day", "Asia/Seoul");
// → 2025-06-15 00:00:00 KST (= 2025-06-14T15:00:00Z)

// Midnight in UTC
DayjsUtil.startOf("2025-06-15T02:00:00Z", "day");
// → 2025-06-15 00:00:00 UTC

// End of month
DayjsUtil.endOf("2025-06-15T00:00:00Z", "month");
// → 2025-06-30T23:59:59.999Z

// Start of week as JS Date (for database queries)
DayjsUtil.startOfDate("2025-06-15T12:00:00Z", "week", "America/New_York");
// → Date representing start of that week in Eastern time

// End of day as JS Date
DayjsUtil.endOfDate("2025-06-15T00:00:00Z", "day", "Asia/Seoul");
// → Date representing 2025-06-15T23:59:59.999 KST
```

### Formatting

| Method                              | Returns  | Description                     |
| ----------------------------------- | -------- | ------------------------------- |
| `formatISOString(date?, tz?)`       | `string` | `2025-01-01T09:00:00+09:00`     |
| `formatUTCString(date?)`            | `string` | `2025-01-01T00:00:00Z`          |
| `formatDateOnlyString(date?, tz?)`  | `string` | `2025-01-01` (timezone-aware)   |
| `extractDateOnlyString(date?)`      | `string` | `2025-01-01` (no tz conversion) |
| `formatString(date, template, tz?)` | `string` | Custom template with timezone   |

```typescript
const date = "2025-06-15T00:00:00Z";

// ISO with timezone offset
DayjsUtil.formatISOString(date, "Asia/Seoul");
// → "2025-06-15T09:00:00+09:00"

// UTC string
DayjsUtil.formatUTCString(date);
// → "2025-06-15T00:00:00Z"

// Date only (timezone-aware — the date may differ across timezones)
DayjsUtil.formatDateOnlyString("2025-06-14T23:00:00Z", "Asia/Seoul");
// → "2025-06-15" (it's already June 15 in Seoul)

// Extract date without timezone conversion (for all-day events)
DayjsUtil.extractDateOnlyString("2025-06-15T09:00:00+09:00");
// → "2025-06-15" (takes the date as-is from the string)

// Custom format template
DayjsUtil.formatString("2025-06-15T00:00:00Z", "YYYY/MM/DD");
// → "2025/06/15"

DayjsUtil.formatString("2025-06-15T00:00:00Z", "HH:mm", "Asia/Seoul");
// → "09:00"

DayjsUtil.formatString(
  "2025-06-15T00:00:00Z",
  "ddd, MMM D, YYYY",
  "America/New_York",
);
// → "Sat, Jun 14, 2025" (still June 14 in New York)
```

### Timestamps

| Method                      | Returns  | Description                   |
| --------------------------- | -------- | ----------------------------- |
| `toUnixSeconds(date?)`      | `number` | Seconds since Unix epoch      |
| `toUnixMilliseconds(date?)` | `number` | Milliseconds since Unix epoch |

```typescript
DayjsUtil.toUnixSeconds("2025-06-15T00:00:00Z");
// → 1750032000

DayjsUtil.toUnixMilliseconds("2025-06-15T00:00:00Z");
// → 1750032000000

// Current time
DayjsUtil.toUnixSeconds(); // seconds since epoch (now)
```

### Duration

| Method                               | Returns  | Description                               |
| ------------------------------------ | -------- | ----------------------------------------- |
| `formatDurationString(ms, options?)` | `string` | Human-readable duration from milliseconds |

```typescript
// Short format (default)
DayjsUtil.formatDurationString(9_000_000); // "2h 30min"
DayjsUtil.formatDurationString(3_600_000); // "1h"
DayjsUtil.formatDurationString(1_800_000); // "30min"

// Long format
DayjsUtil.formatDurationString(9_000_000, { short: false });
// → "2 hours 30 minutes"

DayjsUtil.formatDurationString(3_600_000, { short: false });
// → "1 hour"

// Edge cases
DayjsUtil.formatDurationString(0); // "0min"
DayjsUtil.formatDurationString(-3_600_000); // "1h" (sign dropped)
```

### Comparison

| Method                                                        | Returns   | Description                            |
| ------------------------------------------------------------- | --------- | -------------------------------------- |
| `isSame(d1?, d2?, unit?, timezone?)`                          | `boolean` | Compare two dates at given granularity |
| `diff(d1?, d2?, unit?, timezone?)`                            | `number`  | Difference in specified unit           |
| `isBefore(d1?, d2?, unit?, timezone?)`                        | `boolean` | Check if d1 is before d2               |
| `isAfter(d1?, d2?, unit?, timezone?)`                         | `boolean` | Check if d1 is after d2                |
| `isSameOrBefore(d1?, d2?, unit?, timezone?)`                  | `boolean` | Check if d1 is same or before d2       |
| `isSameOrAfter(d1?, d2?, unit?, timezone?)`                   | `boolean` | Check if d1 is same or after d2        |
| `isBetween(date, start, end, unit?, inclusivity?, timezone?)` | `boolean` | Check if date falls within range       |

```typescript
// isSame: compare at different granularities
DayjsUtil.isSame("2025-06-15T10:00:00Z", "2025-06-15T22:00:00Z", "day");
// → true (same day)

DayjsUtil.isSame("2025-06-15T10:00:00Z", "2025-06-15T22:00:00Z", "hour");
// → false

// diff: calculate difference
DayjsUtil.diff("2025-06-20", "2025-06-15", "day");
// → 5

DayjsUtil.diff("2025-06-15T10:00:00Z", "2025-06-15T08:00:00Z", "hour");
// → 2

// isBefore / isAfter
DayjsUtil.isBefore("2025-06-14", "2025-06-15"); // true
DayjsUtil.isBefore("2025-06-15T23:00", "2025-06-15T01:00", "day"); // false (same day)

DayjsUtil.isAfter("2025-06-16", "2025-06-15"); // true

// isSameOrBefore / isSameOrAfter
DayjsUtil.isSameOrBefore("2025-06-15", "2025-06-15"); // true
DayjsUtil.isSameOrAfter("2025-06-15", "2025-06-14"); // true

// isBetween: range check with bracket notation
DayjsUtil.isBetween("2025-06-15", "2025-06-01", "2025-06-30", "day", "[]");
// → true (inclusive on both ends)

DayjsUtil.isBetween("2025-06-15", "2025-06-15", "2025-06-20");
// → false (default "()" excludes boundaries)

DayjsUtil.isBetween("2025-06-15", "2025-06-15", "2025-06-20", null, "[]");
// → true (inclusive — to set inclusivity without unit, pass null for unit)
```

#### Bracket notation (`isBetween`)

| Notation | Start     | End       | Meaning                        |
| -------- | --------- | --------- | ------------------------------ |
| `()`     | exclusive | exclusive | Default                        |
| `[]`     | inclusive | inclusive | Both boundaries match          |
| `[)`     | inclusive | exclusive | Start matches, end does not    |
| `(]`     | exclusive | inclusive | Start does not match, end does |

### Time Manipulation

| Method                                | Returns   | Description                                         |
| ------------------------------------- | --------- | --------------------------------------------------- |
| `copyTime(source, target, timezone?)` | `Dayjs`   | Copy time from one date onto another's calendar day |
| `isMidnight(date, timezone?)`         | `boolean` | Check if time is exactly 00:00:00.000               |

```typescript
// copyTime: drag-and-drop event to a new day while keeping its time
DayjsUtil.copyTime("2025-06-15T14:30:00Z", "2025-06-20T00:00:00Z");
// → 2025-06-20T14:30:00Z (June 20 with 14:30 from June 15)

// With timezone: preserves wall-clock time in that timezone
DayjsUtil.copyTime(
  "2025-06-15T14:30:00+09:00",
  "2025-06-20T00:00:00+09:00",
  "Asia/Seoul",
);
// → Dayjs representing 2025-06-20 14:30:00 KST

// isMidnight: all-day event detection
DayjsUtil.isMidnight("2025-06-15T00:00:00Z"); // true
DayjsUtil.isMidnight("2025-06-15T09:00:00Z"); // false
DayjsUtil.isMidnight("2025-06-14T15:00:00Z", "Asia/Seoul"); // true (midnight KST)
DayjsUtil.isMidnight("2025-06-15T00:00:00Z", "Asia/Seoul"); // false (09:00 KST)
```

### Calendar Domain

| Method                               | Returns    | Description                              |
| ------------------------------------ | ---------- | ---------------------------------------- |
| `dayOfWeekString(date, timezone?)`   | `RRuleDay` | RRULE day-of-week code (SU, MO, ... SA)  |
| `remainingDays(from, to, timezone?)` | `number`   | Remaining whole days (rounds up partial) |

```typescript
// dayOfWeekString: get RRULE day code
DayjsUtil.dayOfWeekString("2025-06-16T00:00:00Z"); // "MO" (Monday)
DayjsUtil.dayOfWeekString("2025-06-15T00:00:00Z"); // "SU" (Sunday)
DayjsUtil.dayOfWeekString("2025-06-20T00:00:00Z"); // "FR" (Friday)

// RRULE codes: "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA"

// remainingDays: rounds up partial days
DayjsUtil.remainingDays("2025-06-15", "2025-06-20"); // 5
DayjsUtil.remainingDays("2025-06-15", "2025-06-15T01:00:00Z"); // 1 (partial → rounds up)
DayjsUtil.remainingDays("2025-06-15", "2025-06-15"); // 0 (exact same moment)
DayjsUtil.remainingDays("2025-06-20", "2025-06-15"); // -5 (negative = past)
```

### Validation

| Method                           | Returns   | Description                                   |
| -------------------------------- | --------- | --------------------------------------------- |
| `isValidDateFormat(str, format)` | `boolean` | Validate string against `DATE_FORMAT` pattern |

```typescript
import { DayjsUtil, DATE_FORMAT } from "@brandonwie/dayjs-util";

DayjsUtil.isValidDateFormat("2025-06-15", DATE_FORMAT.DATE); // true
DayjsUtil.isValidDateFormat("2025-06-15T10:00:00Z", DATE_FORMAT.DATETIME_UTC); // true
DayjsUtil.isValidDateFormat(
  "2025-06-15T10:00:00+09:00",
  DATE_FORMAT.DATETIME_OFFSET,
); // true
DayjsUtil.isValidDateFormat("not-a-date", DATE_FORMAT.DATE); // false
```

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

> **Optional import** — only adds ~7KB when used. Safe to ignore if you don't work with calendar data.

Calendar APIs (Google, Microsoft, iCal) send event dates in different formats.
EventDateHandler normalizes them to UTC `Date` objects for consistent storage.

### The two kinds of calendar events

| Kind    | What it means                       | Example                        | Goal                               |
| ------- | ----------------------------------- | ------------------------------ | ---------------------------------- |
| All-day | A calendar **date**, not a moment   | "June 15th" (no specific time) | Store as midnight UTC on that date |
| Timed   | A specific **moment** in a timezone | "June 15, 9:00 AM Seoul time"  | Convert to UTC point-in-time       |

### Import

```typescript
import { EventDateHandler } from "@brandonwie/dayjs-util/event";
// or: import { EventDateHandler } from "@brandonwie/dayjs-util";
```

### `toAllDayUTC(start, end)`

Extracts the **date** from any format and returns midnight UTC.
Time and timezone in the input are ignored — only the date matters.

```typescript
// All of these produce the same result:
EventDateHandler.toAllDayUTC("2025-06-15", "2025-06-16"); // Google Calendar
EventDateHandler.toAllDayUTC(
  "2025-06-15T00:00:00+09:00",
  "2025-06-16T00:00:00+09:00",
); // offset string
EventDateHandler.toAllDayUTC("2025-06-15T00:00:00Z", "2025-06-16T00:00:00Z"); // UTC
EventDateHandler.toAllDayUTC("2025-06-15T00:00:00", "2025-06-16T00:00:00"); // Microsoft Graph
EventDateHandler.toAllDayUTC("20250615", "20250616"); // iCal compact
// → { start: Date(2025-06-15T00:00:00Z), end: Date(2025-06-16T00:00:00Z), timezone: "UTC" }
```

### `toTimedUTC(start, end, timezone)`

Converts a timed event to UTC. The `timezone` parameter is used for **parsing**
when the input string has no embedded offset.

```typescript
// String WITH offset — offset used for conversion, timezone stored as metadata
EventDateHandler.toTimedUTC(
  "2025-06-15T09:00:00+09:00",
  "2025-06-15T10:00:00+09:00",
  "Asia/Seoul",
);
// → { start: Date(2025-06-15T00:00:00Z), end: Date(2025-06-15T01:00:00Z), timezone: "Asia/Seoul" }

// String WITHOUT offset — timezone used to interpret the time
EventDateHandler.toTimedUTC(
  "2025-06-15T09:00:00",
  "2025-06-15T10:00:00",
  "Asia/Seoul",
);
// → { start: Date(2025-06-15T00:00:00Z), end: Date(2025-06-15T01:00:00Z), timezone: "Asia/Seoul" }

// UTC string — Z does the work
EventDateHandler.toTimedUTC(
  "2025-06-15T00:00:00Z",
  "2025-06-15T01:00:00Z",
  "UTC",
);
// → { start: Date(2025-06-15T00:00:00Z), end: Date(2025-06-15T01:00:00Z), timezone: "UTC" }
```

### `normalize(params)`

Dispatches to `toAllDayUTC` or `toTimedUTC` based on the `isAllDay` flag.
Returns `null` when start or end is missing.

```typescript
// Timed event (default when isAllDay is omitted)
const result = EventDateHandler.normalize({
  start: "2025-06-15T09:00:00+09:00",
  end: "2025-06-15T10:00:00+09:00",
  timezone: "Asia/Seoul",
});
// → { start: Date(...), end: Date(...), timezone: "Asia/Seoul" }

// All-day event
const allDay = EventDateHandler.normalize({
  start: "2025-06-15",
  end: "2025-06-16",
  timezone: "Asia/Seoul",
  isAllDay: true,
});
// → { start: Date(2025-06-15T00:00:00Z), end: Date(2025-06-16T00:00:00Z), timezone: "UTC" }

// Missing dates
EventDateHandler.normalize({
  start: undefined,
  end: undefined,
  timezone: "UTC",
});
// → null
```

### Supported input formats

| Format            | Example                       | All-day | Timed | Source                   |
| ----------------- | ----------------------------- | ------- | ----- | ------------------------ |
| Plain date        | `"2025-06-15"`                | Yes     | Yes\* | Google Calendar, Cal.com |
| Compact iCal      | `"20250615"`                  | Yes     | Yes\* | RFC 5545 VALUE=DATE      |
| Datetime + offset | `"2025-06-15T09:00:00+09:00"` | Yes     | Yes   | Google Calendar          |
| Datetime UTC      | `"2025-06-15T09:00:00Z"`      | Yes     | Yes   | Calendly                 |
| Datetime bare     | `"2025-06-15T09:00:00"`       | Yes     | Yes   | Microsoft Graph, iCal    |
| Date object       | `new Date(...)`               | Yes     | Yes   | Any                      |

\*Date-only strings in timed events are treated as midnight in the given timezone.

### API summary

| Method                       | Returns                        | Description                  |
| ---------------------------- | ------------------------------ | ---------------------------- |
| `toAllDayUTC(start, end)`    | `NormalizedEventDates`         | Extract date → midnight UTC  |
| `toTimedUTC(start, end, tz)` | `NormalizedEventDates`         | Convert to UTC point-in-time |
| `normalize(params)`          | `NormalizedEventDates \| null` | Dispatch by `isAllDay` flag  |

## Migration Guide: `new Date()` → DayjsUtil

| Before                             | After                                   | Why                                 |
| ---------------------------------- | --------------------------------------- | ----------------------------------- |
| `new Date()`                       | `DayjsUtil.utc().toDate()`              | Explicit UTC, no local tz ambiguity |
| `new Date(str)`                    | `DayjsUtil.utc(str).toDate()`           | Consistent parsing                  |
| `new Date(str).toISOString()`      | `DayjsUtil.formatUTCString(str)`        | Same result, cleaner API            |
| `date.toISOString().split('T')[0]` | `DayjsUtil.extractDateOnlyString(date)` | Handles all input types             |
| `new Date(0)`                      | `DayjsUtil.epoch()`                     | Self-documenting sentinel           |
| `Date.now()`                       | `DayjsUtil.now().valueOf()`             | Timezone-aware "now"                |
| `d1.getTime() - d2.getTime()`      | `DayjsUtil.diff(d1, d2, 'ms')`          | Readable, unit-aware                |
| `d1 < d2`                          | `DayjsUtil.isBefore(d1, d2)`            | Explicit, unit-aware                |
| `d1 >= d2`                         | `DayjsUtil.isSameOrAfter(d1, d2)`       | Timezone-safe                       |
| Manual offset math                 | `DayjsUtil.tz(date, 'Asia/Seoul')`      | IANA timezone, DST-safe             |
| `dayjs(str).tz(tz)`                | `DayjsUtil.tzParse(str, tz)`            | Correct semantics (see above)       |
| `dayjs(d).add(1, 'day')`           | `DayjsUtil.add(d, 1, 'day', tz)`        | DST-safe, timezone explicit         |
| `dayjs(d).startOf('day')`          | `DayjsUtil.startOf(d, 'day', tz)`       | Midnight in correct timezone        |
| `Math.floor(d / 1000)`             | `DayjsUtil.toUnixSeconds(d)`            | Clean API                           |
| `date.getHours() === 0 && ...`     | `DayjsUtil.isMidnight(date, tz)`        | Timezone-aware midnight check       |

## Design Decisions

- **Static class** — no instantiation needed, dayjs instances created per-call (immutable, ~0.01ms)
- **Plugins loaded once** — utc, timezone, isSameOrAfter, isSameOrBefore, isBetween, duration registered at import time
- **Peer dependency on dayjs** — consumers control the version, no duplication
- **Dual CJS/ESM** — works in Node.js, browsers, and bundlers
- **Tree-shakeable** — `sideEffects: false` for optimal bundling; `EventDateHandler` can be imported separately via `/event` entry point
- **~7.7 kB gzipped** total production cost — dayjs core + 6 plugins + this library, measured with esbuild minify + gzip

## How DST is Handled

This library is DST-safe because every timezone-aware method applies the timezone
**before** performing operations. The actual DST resolution is delegated down a chain:

```
DayjsUtil → dayjs timezone plugin → Intl.DateTimeFormat → OS/ICU timezone data
```

This library has no built-in timezone database. It relies on the JavaScript
runtime's [`Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
API, which reads DST rules from the operating system's copy of the
[IANA timezone database](https://www.iana.org/time-zones).

### Why the `timezone` parameter matters for DST

The offset in an ISO 8601 string (e.g., `-05:00`) resolves the input to an exact
UTC instant. The `timezone` parameter tells arithmetic operations which
calendar/clock rules to follow. These are different jobs:

```typescript
// Frontend sends a New York time with offset (EST = -05:00)
DayjsUtil.add("2025-03-09T01:00:00-05:00", 1, "day", "America/New_York");
// → March 10, 01:00 AM EDT (-04:00, DST kicked in)
// → Internally: 2025-03-10T05:00:00Z (23 real hours, not 24)

// Without timezone: raw +24h math
DayjsUtil.add("2025-03-09T01:00:00-05:00", 1, "day");
// → March 10, 02:00 AM EDT (wall-clock drifted by 1 hour)
```

For a calendar showing "daily event at 1:00 AM", that 1-hour drift matters.

### Which methods are DST-aware

| Method                            | Why DST matters                                              |
| --------------------------------- | ------------------------------------------------------------ |
| `add` / `subtract`                | Wall-clock time preserved across DST boundaries              |
| `startOf` / `endOf`               | Midnight depends on the timezone's DST state                 |
| `isSame` / `isBefore` / `isAfter` | "Same day" boundary shifts with DST                          |
| `remainingDays`                   | Uses calendar-day diff, not `ms / 86400000`                  |
| `toTimedUTC` (EventDateHandler)   | `dayjs.tz()` resolves DST when parsing bare datetime strings |

### Edge cases

| Case                                                               | Behavior                                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| **Ambiguous time** (fall-back overlap, e.g., 1:30 AM occurs twice) | dayjs picks the first occurrence (pre-transition)                            |
| **Non-existent time** (spring-forward gap, e.g., 2:30 AM skipped)  | dayjs rolls forward to the next valid time                                   |
| **Stale timezone data**                                            | Requires updating Node.js or OS; this library does not ship its own database |

> **Note:** Timezones that do not observe DST (e.g., `Asia/Seoul`, `UTC`) are
> unaffected. The `timezone` parameter still works — it just applies a fixed offset.

## Breaking Changes in v0.4.0

### EventDateHandler API redesigned

| v0.3.x                                   | v0.4.0                       | Notes                                                                                          |
| ---------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `processAllDayEventDates(start, end)`    | `toAllDayUTC(start, end)`    | Accepts `DateInput` (not just `string`). Always returns midnight.                              |
| `processTimedEventDates(start, end, tz)` | `toTimedUTC(start, end, tz)` | `tz` now used for parsing offset-less strings.                                                 |
| `computeScheduleDates(params)`           | `normalize(params)`          | Params: `start`/`end`/`timezone` (not `startAt`/`endAt`/`timeZone`). Returns object or `null`. |

```typescript
// v0.3.x
const { startAt, endAt, zone } = EventDateHandler.processAllDayEventDates(
  start,
  end,
);
const [s, e, z] = EventDateHandler.computeScheduleDates({
  startAt,
  endAt,
  timeZone,
  isAllDay,
});

// v0.4.0
const { start, end, timezone } = EventDateHandler.toAllDayUTC(
  startDate,
  endDate,
);
const result = EventDateHandler.normalize({ start, end, timezone, isAllDay });
if (result) {
  const { start, end, timezone } = result;
}
```

## References

- [dayjs](https://day.js.org/) — lightweight date library this package wraps
- [Google Calendar API — Create Events](https://developers.google.com/workspace/calendar/api/guides/create-events) — `date` vs `dateTime` field distinction
- [Microsoft Graph — Event Resource Type](https://learn.microsoft.com/en-us/graph/api/resources/event?view=graph-rest-1.0) — `DateTimeTimeZone` type with separate timezone field
- [RFC 5545 — iCalendar](https://datatracker.ietf.org/doc/html/rfc5545) — `VALUE=DATE` vs `VALUE=DATE-TIME`, `TZID` parameter
- [RFC 3339 — Date and Time on the Internet](https://datatracker.ietf.org/doc/html/rfc3339) — timestamp format used by Google Calendar and Calendly
- [Calendly API — Scheduled Events](https://developer.calendly.com/api-docs/d7114b2e5a5a2-list-events) — always-UTC timestamps with `Z` suffix
- [Cal.com API — Schedules](https://cal.com/docs/api-reference/v2/schedules/get-a-schedule) — separate date, time, and timezone fields
- [IANA Time Zone Database](https://www.iana.org/time-zones) — authoritative source for timezone identifiers (e.g., `Asia/Seoul`)

## License

MIT
