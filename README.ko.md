# @brandonwie/dayjs-util

[![npm version](https://img.shields.io/npm/v/@brandonwie/dayjs-util.svg)](https://www.npmjs.com/package/@brandonwie/dayjs-util)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@brandonwie/dayjs-util)](https://bundlephobia.com/package/@brandonwie/dayjs-util)

[English](./README.md) | **한국어**

[dayjs](https://day.js.org/) 기반의 타임존 안전 날짜 유틸리티 — 캘린더 애플리케이션용으로 설계되었습니다.

## 왜 dayjs를 직접 사용하지 않는가?

| 문제                      | 순수 dayjs                                       | 이 라이브러리                                              |
| ------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| **타임존 모호성**         | `dayjs("2025-01-01")` — UTC? 로컬? 서울?         | `DayjsUtil.tzParse("2025-01-01", "Asia/Seoul")` — 명시적   |
| **종일/시간 이벤트 구분** | 내장 구분 없음                                   | `stripTimezoneToUTC()` vs `convertToUTCDate()`             |
| **플러그인 설정**         | `extend(utc)`, `extend(timezone)` 매번 기억 필요 | import 시 자동 로드                                        |
| **반환 타입 명확성**      | 모든 것이 `Dayjs` 반환                           | `*Date` → JS Date, `*String` → string, 접미사 없음 → Dayjs |

## 설치

```bash
pnpm add @brandonwie/dayjs-util dayjs
# 또는
npm install @brandonwie/dayjs-util dayjs
```

> `dayjs`는 **peer dependency**입니다 — 버전을 직접 관리합니다.

## 목차

- [빠른 시작](#빠른-시작)
- [API 레퍼런스](#api-레퍼런스)
  - [파싱](#파싱)
  - [현재 시간](#현재-시간)
  - [변환](#변환)
  - [산술 연산](#산술-연산)
  - [경계값](#경계값)
  - [포맷팅](#포맷팅)
  - [타임스탬프](#타임스탬프)
  - [지속 시간](#지속-시간)
  - [비교](#비교)
  - [시간 조작](#시간-조작)
  - [캘린더 도메인](#캘린더-도메인)
  - [검증](#검증)
- [EventDateHandler](#eventdatehandler-캘린더-이벤트)
  - [toAllDayUTC](#toalldayutcstart-end) | [toTimedUTC](#totimedutcstart-end-timezone) | [normalize](#normalizeparams)
- [마이그레이션 가이드](#마이그레이션-가이드-new-date--dayjsutil)
- [설계 결정](#설계-결정)
- [DST 처리 방식](#dst-처리-방식)
- [v0.4.0 주요 변경 사항](#v040-주요-변경-사항)
- [참고 자료](#참고-자료)
- [라이선스](#라이선스)

## 빠른 시작

```typescript
import { DayjsUtil } from "@brandonwie/dayjs-util";

// 모든 타임존에서 현재 시간 조회
const now = DayjsUtil.now("America/New_York");

// 특정 타임존으로 날짜 문자열 파싱
const seoulMidnight = DayjsUtil.tzParse("2025-01-01 00:00:00", "Asia/Seoul");
// → 2025-01-01 00:00:00 KST를 나타내는 Dayjs (UTC: 2024-12-31 15:00:00)

// DB 저장용 UTC Date로 변환
const utcDate = DayjsUtil.convertToUTCDate("2025-06-15T09:00:00+09:00");
// → Date(2025-06-15T00:00:00.000Z)

// 종일 이벤트: 시간 유지, 타임존 제거
const allDay = DayjsUtil.stripTimezoneToUTC("2025-06-15T00:00:00+09:00");
// → Date(2025-06-15T00:00:00.000Z)  ← 시간 그대로 보존!

// API 응답용 포맷팅
DayjsUtil.formatUTCString(new Date()); // "2025-06-15T00:00:00Z"
DayjsUtil.formatISOString(new Date(), "Asia/Seoul"); // "2025-06-15T09:00:00+09:00"
```

## API 레퍼런스

### 파싱

| 메서드                       | 반환 타입 | 설명                                   |
| ---------------------------- | --------- | -------------------------------------- |
| `utc(date?)`                 | `Dayjs`   | UTC로 생성/변환                        |
| `tz(date?, timezone?)`       | `Dayjs`   | 타임존으로 변환 (같은 순간, 다른 표시) |
| `tzParse(str, timezone?)`    | `Dayjs`   | 해당 타임존으로 파싱 (다른 순간!)      |
| `parseToTz(str?, timezone?)` | `Dayjs`   | 문자열 파싱 후 타임존으로 표시         |

#### `tz()` vs `tzParse()` — 핵심 차이점

```typescript
const str = "2025-01-01 00:00:00";

// tz(): 서버 타임존에서 파싱 후 서울 시간으로 표시 변환
DayjsUtil.tz(str, "Asia/Seoul").toDate();
// → 2025-01-01T00:00:00.000Z (서버가 UTC인 경우)

// tzParse(): 문자열을 서울 시간으로 해석
DayjsUtil.tzParse(str, "Asia/Seoul").toDate();
// → 2024-12-31T15:00:00.000Z (9시간 이전!)
```

사용자 입력을 해당 타임존에서 해석해야 할 때 `tzParse()`를 사용하세요. 이미 알고 있는 UTC 시간을 표시용으로 변환할 때 `tz()`를 사용하세요.

```typescript
// utc(): UTC Dayjs 객체 생성
DayjsUtil.utc("2025-06-15T09:00:00+09:00");
// → 2025-06-15T00:00:00Z를 나타내는 Dayjs

DayjsUtil.utc(); // 현재 UTC 시간

// parseToTz(): 문자열을 파싱하고 타임존으로 표시
DayjsUtil.parseToTz("2025-06-15T00:00:00Z", "Asia/Seoul");
// → 2025-06-15T09:00:00+09:00으로 표시되는 Dayjs
```

### 현재 시간

| 메서드           | 반환 타입 | 설명                      |
| ---------------- | --------- | ------------------------- |
| `now(timezone?)` | `Dayjs`   | 지정된 타임존의 현재 시간 |

```typescript
DayjsUtil.now(); // 현재 UTC 시간
DayjsUtil.now("Asia/Seoul"); // 서울 현재 시간
DayjsUtil.now("America/New_York"); // 뉴욕 현재 시간
```

### 변환

| 메서드                     | 반환 타입 | 설명                                               |
| -------------------------- | --------- | -------------------------------------------------- |
| `convertToUTCDate(date?)`  | `Date`    | 타임존 변환 → UTC. **시간 지정 이벤트**용.         |
| `stripTimezoneToUTC(str?)` | `Date`    | 시간 유지, 타임존만 UTC로 변경. **종일 이벤트**용. |
| `epoch()`                  | `Date`    | `1970-01-01T00:00:00Z` 반환. 센티넬 값.            |

```typescript
// convertToUTCDate: 올바른 타임존 변환
DayjsUtil.convertToUTCDate("2025-06-15T15:00:00+09:00");
// → Date(2025-06-15T06:00:00.000Z)

// stripTimezoneToUTC: 벽시계 시간 유지, UTC로 강제 설정
DayjsUtil.stripTimezoneToUTC("2025-06-15T00:00:00+09:00");
// → Date(2025-06-15T00:00:00.000Z)  ← 시간 보존, 오프셋 제거

// epoch: "해당 없음" 상태를 위한 센티넬 값
DayjsUtil.epoch();
// → Date(1970-01-01T00:00:00.000Z)
```

### 산술 연산

| 메서드                                   | 반환 타입 | 설명                          |
| ---------------------------------------- | --------- | ----------------------------- |
| `add(date, value, unit, timezone?)`      | `Dayjs`   | 날짜에 시간 추가 (DST 안전)   |
| `subtract(date, value, unit, timezone?)` | `Dayjs`   | 날짜에서 시간 감소 (DST 안전) |

> **DST 안전**: DST 경계를 넘어 1일을 추가하면 정확히 24시간이 아닌 다음 날
> 동일한 벽시계 시간을 반환합니다. 정확성을 보장하기 위해 지정된 타임존에서
> 연산이 수행됩니다.

```typescript
// 일 추가
DayjsUtil.add("2025-06-15T09:00:00Z", 3, "day");
// → 2025-06-18T09:00:00Z

// 월말 자동 보정: 1월 31일 + 1개월 = 2월 28일 (3월 3일이 아님)
DayjsUtil.add("2025-01-31T00:00:00Z", 1, "month");
// → 2025-02-28T00:00:00Z

// 타임존과 함께 감산
DayjsUtil.subtract("2025-06-15T09:00:00Z", 2, "hour", "Asia/Seoul");
// → 2025-06-15T16:00:00 KST를 나타내는 Dayjs (원래 18:00 KST)

// 시간 추가
DayjsUtil.add("2025-06-15T09:00:00Z", 5, "hour");
// → 2025-06-15T14:00:00Z
```

### 경계값

| 메서드                               | 반환 타입 | 설명                              |
| ------------------------------------ | --------- | --------------------------------- |
| `startOf(date, unit, timezone?)`     | `Dayjs`   | 타임존 내 시간 단위의 시작        |
| `endOf(date, unit, timezone?)`       | `Dayjs`   | 타임존 내 시간 단위의 끝          |
| `startOfDate(date, unit, timezone?)` | `Date`    | 시간 단위의 시작을 JS Date로 반환 |
| `endOfDate(date, unit, timezone?)`   | `Date`    | 시간 단위의 끝을 JS Date로 반환   |

> **타임존이 중요합니다**: `startOf("day")`는 UTC 자정이 아니라 지정된 타임존의
> 자정을 계산합니다. 서울 사용자가 잘못된 날짜의 이벤트를 보는 일반적인 버그를
> 방지합니다.

```typescript
// 서울 기준 자정 (UTC 자정이 아님!)
DayjsUtil.startOf("2025-06-15T02:00:00Z", "day", "Asia/Seoul");
// → 2025-06-15 00:00:00 KST (= 2025-06-14T15:00:00Z)

// UTC 기준 자정
DayjsUtil.startOf("2025-06-15T02:00:00Z", "day");
// → 2025-06-15 00:00:00 UTC

// 월말
DayjsUtil.endOf("2025-06-15T00:00:00Z", "month");
// → 2025-06-30T23:59:59.999Z

// 주 시작을 JS Date로 (데이터베이스 쿼리용)
DayjsUtil.startOfDate("2025-06-15T12:00:00Z", "week", "America/New_York");
// → 해당 주의 동부 시간 기준 시작을 나타내는 Date

// 일의 끝을 JS Date로
DayjsUtil.endOfDate("2025-06-15T00:00:00Z", "day", "Asia/Seoul");
// → 2025-06-15T23:59:59.999 KST를 나타내는 Date
```

### 포맷팅

| 메서드                              | 반환 타입 | 설명                            |
| ----------------------------------- | --------- | ------------------------------- |
| `formatISOString(date?, tz?)`       | `string`  | `2025-01-01T09:00:00+09:00`     |
| `formatUTCString(date?)`            | `string`  | `2025-01-01T00:00:00Z`          |
| `formatDateOnlyString(date?, tz?)`  | `string`  | `2025-01-01` (타임존 고려)      |
| `extractDateOnlyString(date?)`      | `string`  | `2025-01-01` (타임존 변환 없음) |
| `formatString(date, template, tz?)` | `string`  | 커스텀 템플릿으로 타임존 포맷팅 |

```typescript
const date = "2025-06-15T00:00:00Z";

// 타임존 오프셋이 포함된 ISO 포맷
DayjsUtil.formatISOString(date, "Asia/Seoul");
// → "2025-06-15T09:00:00+09:00"

// UTC 문자열
DayjsUtil.formatUTCString(date);
// → "2025-06-15T00:00:00Z"

// 날짜만 추출 (타임존 고려 — 타임존에 따라 날짜가 다를 수 있음)
DayjsUtil.formatDateOnlyString("2025-06-14T23:00:00Z", "Asia/Seoul");
// → "2025-06-15" (서울에서는 이미 6월 15일)

// 타임존 변환 없이 날짜 추출 (종일 이벤트용)
DayjsUtil.extractDateOnlyString("2025-06-15T09:00:00+09:00");
// → "2025-06-15" (문자열에서 날짜를 그대로 추출)

// 커스텀 포맷 템플릿
DayjsUtil.formatString("2025-06-15T00:00:00Z", "YYYY/MM/DD");
// → "2025/06/15"

DayjsUtil.formatString("2025-06-15T00:00:00Z", "HH:mm", "Asia/Seoul");
// → "09:00"

DayjsUtil.formatString(
  "2025-06-15T00:00:00Z",
  "ddd, MMM D, YYYY",
  "America/New_York",
);
// → "Sat, Jun 14, 2025" (뉴욕에서는 아직 6월 14일)
```

### 타임스탬프

| 메서드                      | 반환 타입 | 설명                   |
| --------------------------- | --------- | ---------------------- |
| `toUnixSeconds(date?)`      | `number`  | Unix epoch 이후 초     |
| `toUnixMilliseconds(date?)` | `number`  | Unix epoch 이후 밀리초 |

```typescript
DayjsUtil.toUnixSeconds("2025-06-15T00:00:00Z");
// → 1750032000

DayjsUtil.toUnixMilliseconds("2025-06-15T00:00:00Z");
// → 1750032000000

// 현재 시간
DayjsUtil.toUnixSeconds(); // epoch 이후 초 (현재)
```

### 지속 시간

| 메서드                               | 반환 타입 | 설명                                  |
| ------------------------------------ | --------- | ------------------------------------- |
| `formatDurationString(ms, options?)` | `string`  | 밀리초를 사람이 읽을 수 있는 문자열로 |

```typescript
// 짧은 형식 (기본값)
DayjsUtil.formatDurationString(9_000_000); // "2h 30min"
DayjsUtil.formatDurationString(3_600_000); // "1h"
DayjsUtil.formatDurationString(1_800_000); // "30min"

// 긴 형식
DayjsUtil.formatDurationString(9_000_000, { short: false });
// → "2 hours 30 minutes"

DayjsUtil.formatDurationString(3_600_000, { short: false });
// → "1 hour"

// 엣지 케이스
DayjsUtil.formatDurationString(0); // "0min"
DayjsUtil.formatDurationString(-3_600_000); // "1h" (부호 제거)
```

### 비교

| 메서드                                                        | 반환 타입 | 설명                          |
| ------------------------------------------------------------- | --------- | ----------------------------- |
| `isSame(d1?, d2?, unit?, timezone?)`                          | `boolean` | 지정 단위로 두 날짜 동일 비교 |
| `diff(d1?, d2?, unit?, timezone?)`                            | `number`  | 지정 단위로 차이 계산         |
| `isBefore(d1?, d2?, unit?, timezone?)`                        | `boolean` | d1이 d2보다 이전인지 확인     |
| `isAfter(d1?, d2?, unit?, timezone?)`                         | `boolean` | d1이 d2보다 이후인지 확인     |
| `isSameOrBefore(d1?, d2?, unit?, timezone?)`                  | `boolean` | d1이 d2와 같거나 이전인지     |
| `isSameOrAfter(d1?, d2?, unit?, timezone?)`                   | `boolean` | d1이 d2와 같거나 이후인지     |
| `isBetween(date, start, end, unit?, inclusivity?, timezone?)` | `boolean` | 날짜가 범위 내에 있는지 확인  |

```typescript
// isSame: 다양한 단위로 비교
DayjsUtil.isSame("2025-06-15T10:00:00Z", "2025-06-15T22:00:00Z", "day");
// → true (같은 날)

DayjsUtil.isSame("2025-06-15T10:00:00Z", "2025-06-15T22:00:00Z", "hour");
// → false

// diff: 차이 계산
DayjsUtil.diff("2025-06-20", "2025-06-15", "day");
// → 5

DayjsUtil.diff("2025-06-15T10:00:00Z", "2025-06-15T08:00:00Z", "hour");
// → 2

// isBefore / isAfter
DayjsUtil.isBefore("2025-06-14", "2025-06-15"); // true
DayjsUtil.isBefore("2025-06-15T23:00", "2025-06-15T01:00", "day"); // false (같은 날)

DayjsUtil.isAfter("2025-06-16", "2025-06-15"); // true

// isSameOrBefore / isSameOrAfter
DayjsUtil.isSameOrBefore("2025-06-15", "2025-06-15"); // true
DayjsUtil.isSameOrAfter("2025-06-15", "2025-06-14"); // true

// isBetween: 브래킷 표기법을 사용한 범위 확인
DayjsUtil.isBetween("2025-06-15", "2025-06-01", "2025-06-30", "day", "[]");
// → true (양쪽 경계 포함)

DayjsUtil.isBetween("2025-06-15", "2025-06-15", "2025-06-20");
// → false (기본값 "()"는 경계 제외)

DayjsUtil.isBetween("2025-06-15", "2025-06-15", "2025-06-20", null, "[]");
// → true (포함 — unit 없이 inclusivity를 설정하려면 unit에 null 전달)
```

#### 브래킷 표기법 (`isBetween`)

| 표기법 | 시작   | 끝     | 의미           |
| ------ | ------ | ------ | -------------- |
| `()`   | 미포함 | 미포함 | 기본값         |
| `[]`   | 포함   | 포함   | 양쪽 경계 일치 |
| `[)`   | 포함   | 미포함 | 시작만 일치    |
| `(]`   | 미포함 | 포함   | 끝만 일치      |

### 시간 조작

| 메서드                                | 반환 타입 | 설명                                   |
| ------------------------------------- | --------- | -------------------------------------- |
| `copyTime(source, target, timezone?)` | `Dayjs`   | 한 날짜의 시간을 다른 날짜의 날에 복사 |
| `isMidnight(date, timezone?)`         | `boolean` | 시간이 정확히 00:00:00.000인지 확인    |

```typescript
// copyTime: 이벤트를 새 날짜로 드래그&드롭할 때 시간 유지
DayjsUtil.copyTime("2025-06-15T14:30:00Z", "2025-06-20T00:00:00Z");
// → 2025-06-20T14:30:00Z (6월 15일의 14:30을 6월 20일에 적용)

// 타임존과 함께: 해당 타임존의 벽시계 시간 보존
DayjsUtil.copyTime(
  "2025-06-15T14:30:00+09:00",
  "2025-06-20T00:00:00+09:00",
  "Asia/Seoul",
);
// → 2025-06-20 14:30:00 KST를 나타내는 Dayjs

// isMidnight: 종일 이벤트 감지
DayjsUtil.isMidnight("2025-06-15T00:00:00Z"); // true
DayjsUtil.isMidnight("2025-06-15T09:00:00Z"); // false
DayjsUtil.isMidnight("2025-06-14T15:00:00Z", "Asia/Seoul"); // true (KST 자정)
DayjsUtil.isMidnight("2025-06-15T00:00:00Z", "Asia/Seoul"); // false (KST 09:00)
```

### 캘린더 도메인

| 메서드                               | 반환 타입  | 설명                             |
| ------------------------------------ | ---------- | -------------------------------- |
| `dayOfWeekString(date, timezone?)`   | `RRuleDay` | RRULE 요일 코드 (SU, MO, ... SA) |
| `remainingDays(from, to, timezone?)` | `number`   | 남은 일수 (부분일은 올림)        |

```typescript
// dayOfWeekString: RRULE 요일 코드 반환
DayjsUtil.dayOfWeekString("2025-06-16T00:00:00Z"); // "MO" (월요일)
DayjsUtil.dayOfWeekString("2025-06-15T00:00:00Z"); // "SU" (일요일)
DayjsUtil.dayOfWeekString("2025-06-20T00:00:00Z"); // "FR" (금요일)

// RRULE 코드: "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA"

// remainingDays: 부분일은 올림 처리
DayjsUtil.remainingDays("2025-06-15", "2025-06-20"); // 5
DayjsUtil.remainingDays("2025-06-15", "2025-06-15T01:00:00Z"); // 1 (부분일 → 올림)
DayjsUtil.remainingDays("2025-06-15", "2025-06-15"); // 0 (정확히 같은 시점)
DayjsUtil.remainingDays("2025-06-20", "2025-06-15"); // -5 (음수 = 과거)
```

### 검증

| 메서드                           | 반환 타입 | 설명                                  |
| -------------------------------- | --------- | ------------------------------------- |
| `isValidDateFormat(str, format)` | `boolean` | `DATE_FORMAT` 패턴에 대한 문자열 검증 |

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

#### 지원하는 `DATE_FORMAT` 상수

| 상수                 | 패턴                            | 예시                            |
| -------------------- | ------------------------------- | ------------------------------- |
| `DATE`               | `YYYY-MM-DD`                    | `2025-01-01`                    |
| `DATETIME`           | `YYYY-MM-DDTHH:mm:ss`           | `2025-01-01T10:00:00`           |
| `DATETIME_UTC`       | `YYYY-MM-DDTHH:mm:ssZ`          | `2025-01-01T10:00:00Z`          |
| `DATETIME_OFFSET`    | `YYYY-MM-DDTHH:mm:ss±HH:mm`     | `2025-01-01T10:00:00+09:00`     |
| `DATETIME_MS`        | `YYYY-MM-DDTHH:mm:ss.SSS`       | `2025-01-01T10:00:00.000`       |
| `DATETIME_MS_UTC`    | `YYYY-MM-DDTHH:mm:ss.SSSZ`      | `2025-01-01T10:00:00.000Z`      |
| `DATETIME_MS_OFFSET` | `YYYY-MM-DDTHH:mm:ss.SSS±HH:mm` | `2025-01-01T10:00:00.000+09:00` |

## EventDateHandler (캘린더 이벤트)

> **선택적 import** — 사용 시 ~7KB만 추가됩니다. 캘린더 데이터를 다루지 않는다면 무시해도 됩니다.

캘린더 API(Google, Microsoft, iCal)는 이벤트 날짜를 다양한 형식으로 전송합니다.
EventDateHandler는 이를 일관된 저장을 위해 UTC `Date` 객체로 정규화합니다.

### 두 종류의 캘린더 이벤트

| 종류        | 의미                            | 예시                          | 목표                          |
| ----------- | ------------------------------- | ----------------------------- | ----------------------------- |
| 종일 이벤트 | 캘린더 **날짜**, 특정 시점 아님 | "6월 15일" (특정 시간 없음)   | 해당 날짜의 UTC 자정으로 저장 |
| 시간 지정   | 특정 타임존의 **시점**          | "6월 15일 오전 9시 서울 시간" | UTC 시점으로 변환             |

### Import

```typescript
import { EventDateHandler } from "@brandonwie/dayjs-util/event";
// 또는: import { EventDateHandler } from "@brandonwie/dayjs-util";
```

### `toAllDayUTC(start, end)`

모든 형식에서 **날짜**를 추출하여 UTC 자정을 반환합니다.
입력의 시간과 타임존은 무시됩니다 — 날짜만 중요합니다.

```typescript
// 아래 모두 동일한 결과를 반환합니다:
EventDateHandler.toAllDayUTC("2025-06-15", "2025-06-16"); // Google Calendar
EventDateHandler.toAllDayUTC(
  "2025-06-15T00:00:00+09:00",
  "2025-06-16T00:00:00+09:00",
); // 오프셋 문자열
EventDateHandler.toAllDayUTC("2025-06-15T00:00:00Z", "2025-06-16T00:00:00Z"); // UTC
EventDateHandler.toAllDayUTC("2025-06-15T00:00:00", "2025-06-16T00:00:00"); // Microsoft Graph
EventDateHandler.toAllDayUTC("20250615", "20250616"); // iCal 압축 형식
// → { start: Date(2025-06-15T00:00:00Z), end: Date(2025-06-16T00:00:00Z), timezone: "UTC" }
```

### `toTimedUTC(start, end, timezone)`

시간 지정 이벤트를 UTC로 변환합니다. `timezone` 매개변수는 입력 문자열에 오프셋이
없을 때 **파싱에 사용**됩니다.

```typescript
// 오프셋이 포함된 문자열 — 오프셋으로 변환, timezone은 메타데이터로 저장
EventDateHandler.toTimedUTC(
  "2025-06-15T09:00:00+09:00",
  "2025-06-15T10:00:00+09:00",
  "Asia/Seoul",
);
// → { start: Date(2025-06-15T00:00:00Z), end: Date(2025-06-15T01:00:00Z), timezone: "Asia/Seoul" }

// 오프셋이 없는 문자열 — timezone으로 시간을 해석
EventDateHandler.toTimedUTC(
  "2025-06-15T09:00:00",
  "2025-06-15T10:00:00",
  "Asia/Seoul",
);
// → { start: Date(2025-06-15T00:00:00Z), end: Date(2025-06-15T01:00:00Z), timezone: "Asia/Seoul" }

// UTC 문자열 — Z가 변환 처리
EventDateHandler.toTimedUTC(
  "2025-06-15T00:00:00Z",
  "2025-06-15T01:00:00Z",
  "UTC",
);
// → { start: Date(2025-06-15T00:00:00Z), end: Date(2025-06-15T01:00:00Z), timezone: "UTC" }
```

### `normalize(params)`

`isAllDay` 플래그에 따라 `toAllDayUTC` 또는 `toTimedUTC`로 분기합니다.
start 또는 end가 없으면 `null`을 반환합니다.

```typescript
// 시간 지정 이벤트 (isAllDay 생략 시 기본값)
const result = EventDateHandler.normalize({
  start: "2025-06-15T09:00:00+09:00",
  end: "2025-06-15T10:00:00+09:00",
  timezone: "Asia/Seoul",
});
// → { start: Date(...), end: Date(...), timezone: "Asia/Seoul" }

// 종일 이벤트
const allDay = EventDateHandler.normalize({
  start: "2025-06-15",
  end: "2025-06-16",
  timezone: "Asia/Seoul",
  isAllDay: true,
});
// → { start: Date(2025-06-15T00:00:00Z), end: Date(2025-06-16T00:00:00Z), timezone: "UTC" }

// 날짜 누락
EventDateHandler.normalize({
  start: undefined,
  end: undefined,
  timezone: "UTC",
});
// → null
```

### 지원하는 입력 형식

| 형식                   | 예시                          | 종일 | 시간 지정 | 출처                     |
| ---------------------- | ----------------------------- | ---- | --------- | ------------------------ |
| 날짜 문자열            | `"2025-06-15"`                | 가능 | 가능\*    | Google Calendar, Cal.com |
| iCal 압축 형식         | `"20250615"`                  | 가능 | 가능\*    | RFC 5545 VALUE=DATE      |
| 날짜시간 + 오프셋      | `"2025-06-15T09:00:00+09:00"` | 가능 | 가능      | Google Calendar          |
| 날짜시간 UTC           | `"2025-06-15T09:00:00Z"`      | 가능 | 가능      | Calendly                 |
| 날짜시간 (오프셋 없음) | `"2025-06-15T09:00:00"`       | 가능 | 가능      | Microsoft Graph, iCal    |
| Date 객체              | `new Date(...)`               | 가능 | 가능      | 모든 환경                |

\*시간 지정 이벤트에서 날짜 전용 문자열은 지정된 타임존의 자정으로 처리됩니다.

### API 요약

| 메서드                       | 반환 타입                      | 설명                          |
| ---------------------------- | ------------------------------ | ----------------------------- |
| `toAllDayUTC(start, end)`    | `NormalizedEventDates`         | 날짜 추출 → UTC 자정          |
| `toTimedUTC(start, end, tz)` | `NormalizedEventDates`         | UTC 시점으로 변환             |
| `normalize(params)`          | `NormalizedEventDates \| null` | `isAllDay` 플래그에 따라 분기 |

## 마이그레이션 가이드: `new Date()` → DayjsUtil

| 기존 코드                          | 변경 후                                 | 이유                                |
| ---------------------------------- | --------------------------------------- | ----------------------------------- |
| `new Date()`                       | `DayjsUtil.utc().toDate()`              | 명시적 UTC, 로컬 타임존 모호성 제거 |
| `new Date(str)`                    | `DayjsUtil.utc(str).toDate()`           | 일관된 파싱                         |
| `new Date(str).toISOString()`      | `DayjsUtil.formatUTCString(str)`        | 동일 결과, 깔끔한 API               |
| `date.toISOString().split('T')[0]` | `DayjsUtil.extractDateOnlyString(date)` | 모든 입력 타입 처리                 |
| `new Date(0)`                      | `DayjsUtil.epoch()`                     | 자기 설명적 센티넬 값               |
| `Date.now()`                       | `DayjsUtil.now().valueOf()`             | 타임존 인식 "now"                   |
| `d1.getTime() - d2.getTime()`      | `DayjsUtil.diff(d1, d2, 'ms')`          | 가독성, 단위 인식                   |
| `d1 < d2`                          | `DayjsUtil.isBefore(d1, d2)`            | 명시적, 단위 인식                   |
| `d1 >= d2`                         | `DayjsUtil.isSameOrAfter(d1, d2)`       | 타임존 안전                         |
| 수동 오프셋 계산                   | `DayjsUtil.tz(date, 'Asia/Seoul')`      | IANA 타임존, DST 안전               |
| `dayjs(str).tz(tz)`                | `DayjsUtil.tzParse(str, tz)`            | 정확한 시맨틱 (위 설명 참조)        |
| `dayjs(d).add(1, 'day')`           | `DayjsUtil.add(d, 1, 'day', tz)`        | DST 안전, 타임존 명시적             |
| `dayjs(d).startOf('day')`          | `DayjsUtil.startOf(d, 'day', tz)`       | 올바른 타임존의 자정                |
| `Math.floor(d / 1000)`             | `DayjsUtil.toUnixSeconds(d)`            | 깔끔한 API                          |
| `date.getHours() === 0 && ...`     | `DayjsUtil.isMidnight(date, tz)`        | 타임존 인식 자정 확인               |

## 설계 결정

- **Static 클래스** — 인스턴스화 불필요, dayjs 인스턴스는 호출마다 생성 (불변, ~0.01ms)
- **플러그인 1회 로드** — utc, timezone, isSameOrAfter, isSameOrBefore, isBetween, duration은 import 시 등록
- **dayjs peer dependency** — 사용자가 버전 관리, 중복 방지
- **Dual CJS/ESM** — Node.js, 브라우저, 번들러 모두 지원
- **트리 셰이킹 지원** — 최적 번들링을 위한 `sideEffects: false`; `EventDateHandler`는 `/event` 엔트리 포인트로 별도 import 가능
- **gzip 기준 ~7.7 kB** — dayjs 코어 + 플러그인 6개 + 이 라이브러리의 총 프로덕션 번들 크기 (esbuild minify + gzip 측정)

## DST 처리 방식

이 라이브러리는 모든 타임존 인식 메서드가 연산 **이전에** 타임존을 적용하기 때문에
DST에 안전합니다. 실제 DST 해석은 다음 체인으로 위임됩니다:

```
DayjsUtil → dayjs timezone 플러그인 → Intl.DateTimeFormat → OS/ICU 타임존 데이터
```

이 라이브러리는 자체 타임존 데이터베이스를 내장하지 않습니다. JavaScript 런타임의
[`Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
API에 의존하며, 이는 운영체제의
[IANA 타임존 데이터베이스](https://www.iana.org/time-zones) 사본에서 DST 규칙을
읽습니다.

### DST에서 `timezone` 매개변수가 중요한 이유

ISO 8601 문자열의 오프셋(예: `-05:00`)은 입력을 정확한 UTC 시점으로 변환합니다.
`timezone` 매개변수는 산술 연산에서 어떤 캘린더/시계 규칙을 따를지 지정합니다.
이 둘은 다른 역할입니다:

```typescript
// 프론트엔드가 뉴욕 시간을 오프셋과 함께 전송 (EST = -05:00)
DayjsUtil.add("2025-03-09T01:00:00-05:00", 1, "day", "America/New_York");
// → 3월 10일 오전 1:00 EDT (-04:00, DST 적용됨)
// → 내부값: 2025-03-10T05:00:00Z (24시간이 아닌 23시간)

// timezone 없이: 단순 +24시간 계산
DayjsUtil.add("2025-03-09T01:00:00-05:00", 1, "day");
// → 3월 10일 오전 2:00 EDT (벽시계 시간이 1시간 밀림)
```

"매일 오전 1시 이벤트"를 표시하는 캘린더에서 이 1시간 차이는 중요합니다.

### DST 인식 메서드

| 메서드                            | DST가 중요한 이유                                    |
| --------------------------------- | ---------------------------------------------------- |
| `add` / `subtract`                | DST 경계에서 벽시계 시간 보존                        |
| `startOf` / `endOf`               | 자정은 타임존의 DST 상태에 따라 달라짐               |
| `isSame` / `isBefore` / `isAfter` | "같은 날" 경계가 DST에 따라 이동                     |
| `remainingDays`                   | `ms / 86400000`이 아닌 캘린더 일 차이 사용           |
| `toTimedUTC` (EventDateHandler)   | 오프셋 없는 datetime 파싱 시 `dayjs.tz()`로 DST 해석 |

### 엣지 케이스

| 경우                                                         | 동작                                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **모호한 시간** (가을 전환 중복, 예: 오전 1:30이 두 번 발생) | dayjs가 첫 번째 발생(전환 전)을 선택                                    |
| **존재하지 않는 시간** (봄 전환 건너뜀, 예: 오전 2:30 생략)  | dayjs가 다음 유효 시간으로 이동                                         |
| **오래된 타임존 데이터**                                     | Node.js 또는 OS 업데이트 필요; 이 라이브러리는 자체 데이터베이스 미포함 |

> **참고:** DST를 적용하지 않는 타임존(예: `Asia/Seoul`, `UTC`)은 영향을 받지
> 않습니다. `timezone` 매개변수는 여전히 작동하며, 고정 오프셋만 적용됩니다.

## v0.4.0 주요 변경 사항

### EventDateHandler API 재설계

| v0.3.x                                   | v0.4.0                       | 비고                                                                                             |
| ---------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `processAllDayEventDates(start, end)`    | `toAllDayUTC(start, end)`    | `DateInput` 지원 (`string`만이 아님). 항상 자정 반환.                                            |
| `processTimedEventDates(start, end, tz)` | `toTimedUTC(start, end, tz)` | `tz`가 오프셋 없는 문자열 파싱에 사용됨.                                                         |
| `computeScheduleDates(params)`           | `normalize(params)`          | 매개변수: `start`/`end`/`timezone` (`startAt`/`endAt`/`timeZone`이 아님). 객체 또는 `null` 반환. |

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

## 기여하기

기여를 환영합니다! 이슈나 풀 리퀘스트를 제출하기 전에 [기여 가이드](./CONTRIBUTING.md)를 읽어주세요. [버그 리포트](https://github.com/brandonwie/dayjs-util/issues/new?template=bug_report.yml)와 [기능 요청](https://github.com/brandonwie/dayjs-util/issues/new?template=feature_request.yml) 이슈 템플릿을 제공하고 있습니다.

## 참고 자료

- [dayjs](https://day.js.org/) — 이 패키지가 래핑하는 경량 날짜 라이브러리
- [Google Calendar API — 이벤트 생성](https://developers.google.com/workspace/calendar/api/guides/create-events) — `date` vs `dateTime` 필드 구분
- [Microsoft Graph — Event 리소스 타입](https://learn.microsoft.com/en-us/graph/api/resources/event?view=graph-rest-1.0) — 별도 timezone 필드가 있는 `DateTimeTimeZone` 타입
- [RFC 5545 — iCalendar](https://datatracker.ietf.org/doc/html/rfc5545) — `VALUE=DATE` vs `VALUE=DATE-TIME`, `TZID` 매개변수
- [RFC 3339 — 인터넷 날짜 및 시간](https://datatracker.ietf.org/doc/html/rfc3339) — Google Calendar과 Calendly가 사용하는 타임스탬프 형식
- [Calendly API — 예약 이벤트](https://developer.calendly.com/api-docs/d7114b2e5a5a2-list-events) — `Z` 접미사가 포함된 항상-UTC 타임스탬프
- [Cal.com API — 스케줄](https://cal.com/docs/api-reference/v2/schedules/get-a-schedule) — 날짜, 시간, 타임존을 별도 필드로 분리
- [IANA 시간대 데이터베이스](https://www.iana.org/time-zones) — 타임존 식별자의 공식 출처 (예: `Asia/Seoul`)

## 라이선스

MIT
