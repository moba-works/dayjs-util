import { afterEach, describe, expect, it, vi } from "vitest";
import { DayjsUtil, dayjs } from "./DayjsUtil";
import { EventDateHandler } from "./EventDateHandler";
import { DATE_FORMAT, UTC } from "./constants";

describe(DayjsUtil.name, () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // Test date string (June 15, 2025, 9:00 AM, Seoul time)
  const testDateString = "2025-06-15T09:00:00+09:00";
  // Test date string (June 15, 2025, 8:00 AM, Seoul time)
  const testDateString2 = "2025-06-15T08:00:00+09:00";
  // Same time in UTC format
  const testUTCString = "2025-06-15T00:00:00Z";
  // Date-only string
  const testDateOnlyString = "2025-06-15";

  // ─── Formatting Methods ──────────────────────────────────────────

  describe(DayjsUtil.formatISOString.name, () => {
    it("should format date with specific timezone", () => {
      const result = DayjsUtil.formatISOString(testDateString, "Asia/Seoul");
      expect(result).toMatch(/2025-06-15T09:00:00\+09:00/);
    });

    it("should use UTC as default timezone if not specified", () => {
      const result = DayjsUtil.formatISOString(testDateString);
      expect(result).toMatch(/2025-06-15T00:00:00\+00:00/);
    });

    it("should handle null timezone as UTC", () => {
      const result = DayjsUtil.formatISOString(testDateString, null);
      expect(result).toMatch(/2025-06-15T00:00:00\+00:00/);
    });
  });

  describe(DayjsUtil.formatUTCString.name, () => {
    it("should format date in UTC format", () => {
      const result = DayjsUtil.formatUTCString(testDateString);
      expect(result).toBe(testUTCString);
    });
  });

  describe(DayjsUtil.formatDateOnlyString.name, () => {
    it("should format date-only string", () => {
      const result = DayjsUtil.formatDateOnlyString(testDateString);
      expect(result).toBe(testDateOnlyString);
    });

    it("should consider timezone when determining the date", () => {
      const result = DayjsUtil.formatDateOnlyString(
        testDateString,
        "Pacific/Kiritimati",
      );
      expect(result).toBe("2025-06-15");
    });

    it("should consider UTC timezone when determining the date", () => {
      const result = DayjsUtil.formatDateOnlyString(testDateString2);
      expect(result).toBe("2025-06-14");
    });
  });

  // ─── Parsing Methods ─────────────────────────────────────────────

  describe(DayjsUtil.parseToTz.name, () => {
    it("should parse string to dayjs object", () => {
      const result = DayjsUtil.parseToTz(testDateString);
      expect(result.format()).toContain(testDateOnlyString);
    });

    it("should parse with specified timezone", () => {
      const result = DayjsUtil.parseToTz(testDateString, "Asia/Seoul");
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-06-15 09:00:00");
    });
  });

  describe(DayjsUtil.utc.name, () => {
    it("should create dayjs object in UTC", () => {
      const result = DayjsUtil.utc(testDateString);
      expect(result.format()).toBe("2025-06-15T00:00:00Z");
    });

    it("should convert Date object to UTC", () => {
      const date = new Date("2025-06-15T09:00:00+09:00");
      const result = DayjsUtil.utc(date);
      expect(result.format()).toBe("2025-06-15T00:00:00Z");
    });
  });

  describe(DayjsUtil.tz.name, () => {
    it("should create dayjs object in specified timezone", () => {
      const result = DayjsUtil.tz(testUTCString, "Asia/Seoul");
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-06-15 09:00:00");
    });

    it("should use UTC as default timezone if not specified", () => {
      const result = DayjsUtil.tz(testUTCString);
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-06-15 00:00:00");
    });
  });

  describe(DayjsUtil.tzParse.name, () => {
    it("should parse date string AS being in the specified timezone", () => {
      const result = DayjsUtil.tzParse("2025-01-01 00:00:00", "Asia/Seoul");
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-01-01 00:00:00");

      const utc = result.utc();
      expect(utc.format("YYYY-MM-DD HH:mm:ss")).toBe("2024-12-31 15:00:00");
    });

    it("should produce different Date from tz() for timezone-sensitive strings", () => {
      const dateString = "2025-01-01 00:00:00";
      const timezone = "Asia/Seoul";

      const tzParseResult = DayjsUtil.tzParse(dateString, timezone).toDate();
      const tzResult = DayjsUtil.tz(dateString, timezone).toDate();

      expect(tzParseResult.toISOString()).toBe("2024-12-31T15:00:00.000Z");
      expect(tzResult.toISOString()).toBe("2025-01-01T00:00:00.000Z");

      const diffMs = tzResult.getTime() - tzParseResult.getTime();
      expect(diffMs).toBe(9 * 60 * 60 * 1000);
    });

    it("should use UTC as default timezone if not specified", () => {
      const result = DayjsUtil.tzParse("2025-01-01 00:00:00");
      expect(result.toDate().toISOString()).toBe("2025-01-01T00:00:00.000Z");
    });

    it("should handle America/Los_Angeles timezone (UTC-8)", () => {
      const result = DayjsUtil.tzParse(
        "2025-01-01 00:00:00",
        "America/Los_Angeles",
      );
      const utc = result.utc();
      expect(utc.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-01-01 08:00:00");
    });

    it("should be used for period bounds in recurring event expansion", () => {
      const periodStart = DayjsUtil.tzParse(
        "2025-01-01 00:00:00",
        "Asia/Seoul",
      ).toDate();
      const periodEnd = DayjsUtil.tzParse(
        "2025-01-31 23:59:59",
        "Asia/Seoul",
      ).toDate();

      expect(periodStart.toISOString()).toBe("2024-12-31T15:00:00.000Z");
      expect(periodEnd.toISOString()).toBe("2025-01-31T14:59:59.000Z");
    });
  });

  // ─── Conversion Methods ──────────────────────────────────────────

  describe(DayjsUtil.convertToUTCDate.name, () => {
    it("should convert to JavaScript Date object in UTC", () => {
      const result = DayjsUtil.convertToUTCDate(testDateString);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe("2025-06-15T00:00:00.000Z");
    });
  });

  describe(DayjsUtil.epoch.name, () => {
    it("should return Unix epoch (1970-01-01T00:00:00Z)", () => {
      const result = DayjsUtil.epoch();
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe("1970-01-01T00:00:00.000Z");
      expect(result.getTime()).toBe(0);
    });
  });

  describe(DayjsUtil.stripTimezoneToUTC.name, () => {
    it("should return current UTC time when called without a date", () => {
      const result = DayjsUtil.stripTimezoneToUTC();
      expect(result).toBeInstanceOf(Date);
    });

    it("should preserve time values but convert to UTC timezone", () => {
      const result = DayjsUtil.stripTimezoneToUTC("2025-06-15T12:34:56");
      expect(result.toISOString()).toBe("2025-06-15T12:34:56.000Z");
    });

    it("should preserve time values but ignore timezone info", () => {
      const dateStr = "2025-06-15T15:30:45+09:00";
      const result = DayjsUtil.stripTimezoneToUTC(dateStr);
      expect(result.toISOString()).toBe("2025-06-15T15:30:45.000Z");
    });

    it("should correctly handle string input without timezone conversion", () => {
      const year = 2025;
      const month = 5; // 0-based (June)
      const day = 15;
      const hours = 9;
      const minutes = 45;
      const seconds = 30;

      const dateStr = `${year}-${month + 1}-${day}T${hours}:${minutes}:${seconds}`;
      const result = DayjsUtil.stripTimezoneToUTC(dateStr);

      expect(result.getUTCFullYear()).toBe(year);
      expect(result.getUTCMonth()).toBe(month);
      expect(result.getUTCDate()).toBe(day);
      expect(result.getUTCHours()).toBe(hours);
      expect(result.getUTCMinutes()).toBe(minutes);
      expect(result.getUTCSeconds()).toBe(seconds);
    });
  });

  // ─── extractDateOnlyString ───────────────────────────────────────

  describe(DayjsUtil.extractDateOnlyString.name, () => {
    describe("timezone-agnostic date extraction", () => {
      it("should extract date without timezone conversion for KST input", () => {
        const result = DayjsUtil.extractDateOnlyString(
          "2025-08-11T00:00:00.000+09:00",
        );
        expect(result).toBe("2025-08-11");
      });

      it("should extract date without timezone conversion for UTC input", () => {
        const result = DayjsUtil.extractDateOnlyString(
          "2025-08-11T00:00:00.000Z",
        );
        expect(result).toBe("2025-08-11");
      });

      it("should handle date at UTC/KST boundary correctly", () => {
        expect(
          DayjsUtil.extractDateOnlyString("2025-08-10T15:00:00.000Z"),
        ).toBe("2025-08-10");
        expect(
          DayjsUtil.extractDateOnlyString("2025-08-11T00:00:00.000+09:00"),
        ).toBe("2025-08-11");
      });

      it("should handle various timezone offsets", () => {
        const testCases = [
          { input: "2025-08-11T00:00:00.000+09:00", expected: "2025-08-11" },
          { input: "2025-08-11T00:00:00.000-05:00", expected: "2025-08-11" },
          { input: "2025-08-11T00:00:00.000+00:00", expected: "2025-08-11" },
          { input: "2025-08-11T00:00:00.000Z", expected: "2025-08-11" },
          { input: "2025-08-11T23:59:59.999+09:00", expected: "2025-08-11" },
        ];

        testCases.forEach(({ input, expected }) => {
          expect(DayjsUtil.extractDateOnlyString(input)).toBe(expected);
        });
      });

      it("should handle Date objects correctly", () => {
        const date = new Date("2025-08-11T00:00:00.000Z");
        const result = DayjsUtil.extractDateOnlyString(date);
        expect(result).toBe("2025-08-11");
      });

      it("should handle edge cases", () => {
        const todayUTC = new Date().toISOString().split("T")[0];
        expect(DayjsUtil.extractDateOnlyString()).toBe(todayUTC);
        expect(DayjsUtil.extractDateOnlyString("2025-08-11")).toBe(
          "2025-08-11",
        );
        expect(DayjsUtil.extractDateOnlyString("2025-08-11 15:30:00")).toBe(
          "2025-08-11",
        );

        const timestamp = new Date("2025-08-11T00:00:00Z").getTime();
        const result = DayjsUtil.extractDateOnlyString(timestamp);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
      });
    });

    describe("comparison with convertToUTCDate", () => {
      it("should produce different results for all-day events", () => {
        const kstMidnight = "2025-08-11T00:00:00.000+09:00";

        const extracted = DayjsUtil.extractDateOnlyString(kstMidnight);
        expect(extracted).toBe("2025-08-11");

        const converted = DayjsUtil.convertToUTCDate(kstMidnight);
        const convertedDateStr = converted.toISOString().split("T")[0];
        expect(convertedDateStr).toBe("2025-08-10");
      });
    });

    describe("edge cases", () => {
      it("should handle non-ISO string with date pattern", () => {
        const result = DayjsUtil.extractDateOnlyString(
          "Event on 2025-08-15 at 10am",
        );
        expect(result).toBe("2025-08-15");
      });

      it("should handle dayjs object", () => {
        const dayjsDate = dayjs("2025-08-15T10:00:00");
        const result = DayjsUtil.extractDateOnlyString(dayjsDate);
        expect(result).toBe("2025-08-15");
      });

      it("should handle non-date object with toString containing date", () => {
        const customObject = { toString: () => "Custom date: 2025-08-15" };
        const result = DayjsUtil.extractDateOnlyString(
          customObject as unknown as string,
        );
        expect(result).toBe("2025-08-15");
      });

      it("should return current UTC date for invalid input", () => {
        const result = DayjsUtil.extractDateOnlyString("no date here");
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  // ─── Comparison Methods ──────────────────────────────────────────

  describe(DayjsUtil.isSame.name, () => {
    it("should return true if two dates are the same (default: ms)", () => {
      const d1 = DayjsUtil.tz("2025-06-15T09:00:00+09:00", "Asia/Seoul");
      const d2 = DayjsUtil.tz("2025-06-15T09:00:00+09:00", "Asia/Seoul");
      expect(DayjsUtil.isSame(d1, d2)).toBe(true);
    });

    it("should return false if two dates are different", () => {
      const d1 = DayjsUtil.tz("2025-06-15T09:00:00+09:00", "Asia/Seoul");
      const d2 = DayjsUtil.tz("2025-06-15T10:00:00+09:00", "Asia/Seoul");
      expect(DayjsUtil.isSame(d1, d2)).toBe(false);
    });

    it("should return true if two dates are in the same day (unit: day)", () => {
      const d1 = DayjsUtil.tz("2025-06-15T09:00:00+09:00", "Asia/Seoul");
      const d2 = DayjsUtil.tz("2025-06-15T23:59:59+09:00", "Asia/Seoul");
      expect(DayjsUtil.isSame(d1, d2, "day")).toBe(true);
    });

    it("should return false if two dates are in different days (unit: day)", () => {
      const d1 = DayjsUtil.tz("2025-06-15T09:00:00+09:00", "Asia/Seoul");
      const d2 = DayjsUtil.tz("2025-06-16T00:00:00+09:00", "Asia/Seoul");
      expect(DayjsUtil.isSame(d1, d2, "day")).toBe(false);
    });
  });

  describe(DayjsUtil.diff.name, () => {
    it("should return 0 if two dates are the same (default: ms)", () => {
      const d1 = DayjsUtil.tz("2025-06-15T09:00:00+09:00", "Asia/Seoul");
      const d2 = DayjsUtil.tz("2025-06-15T09:00:00+09:00", "Asia/Seoul");
      expect(DayjsUtil.diff(d1, d2)).toBe(0);
    });

    it("should return positive ms if first date is after second", () => {
      const d1 = DayjsUtil.tz("2025-06-15T10:00:00+09:00", "Asia/Seoul");
      const d2 = DayjsUtil.tz("2025-06-15T09:00:00+09:00", "Asia/Seoul");
      expect(DayjsUtil.diff(d1, d2)).toBe(3600000);
    });

    it("should return negative ms if first date is before second", () => {
      const d1 = DayjsUtil.tz("2025-06-15T08:00:00+09:00", "Asia/Seoul");
      const d2 = DayjsUtil.tz("2025-06-15T09:00:00+09:00", "Asia/Seoul");
      expect(DayjsUtil.diff(d1, d2)).toBe(-3600000);
    });

    it("should return diff in days if unit is day", () => {
      const d1 = DayjsUtil.tz("2025-06-16T09:00:00+09:00", "Asia/Seoul");
      const d2 = DayjsUtil.tz("2025-06-15T09:00:00+09:00", "Asia/Seoul");
      expect(DayjsUtil.diff(d1, d2, "day")).toBe(1);
    });

    it("should return 0 if same day (unit: day)", () => {
      const d1 = DayjsUtil.tz("2025-06-15T09:00:00+09:00", "Asia/Seoul");
      const d2 = DayjsUtil.tz("2025-06-15T23:59:59+09:00", "Asia/Seoul");
      expect(DayjsUtil.diff(d1, d2, "day")).toBe(0);
    });
  });

  // ─── Validation ──────────────────────────────────────────────────

  describe(DayjsUtil.isValidDateFormat.name, () => {
    it("should validate DATE format", () => {
      expect(DayjsUtil.isValidDateFormat("2025-06-15", DATE_FORMAT.DATE)).toBe(
        true,
      );
      expect(DayjsUtil.isValidDateFormat("2025-6-15", DATE_FORMAT.DATE)).toBe(
        false,
      );
      expect(DayjsUtil.isValidDateFormat("not-a-date", DATE_FORMAT.DATE)).toBe(
        false,
      );
    });

    it("should validate DATETIME format", () => {
      expect(
        DayjsUtil.isValidDateFormat(
          "2025-06-15T09:00:00",
          DATE_FORMAT.DATETIME,
        ),
      ).toBe(true);
      expect(
        DayjsUtil.isValidDateFormat("2025-06-15", DATE_FORMAT.DATETIME),
      ).toBe(false);
    });

    it("should validate DATETIME_MS format", () => {
      expect(
        DayjsUtil.isValidDateFormat(
          "2025-06-15T09:00:00.000",
          DATE_FORMAT.DATETIME_MS,
        ),
      ).toBe(true);
      expect(
        DayjsUtil.isValidDateFormat(
          "2025-06-15T09:00:00",
          DATE_FORMAT.DATETIME_MS,
        ),
      ).toBe(false);
    });

    it("should validate DATETIME_UTC format (Z suffix, no ms)", () => {
      expect(
        DayjsUtil.isValidDateFormat(
          "2025-06-15T09:00:00Z",
          DATE_FORMAT.DATETIME_UTC,
        ),
      ).toBe(true);
      expect(
        DayjsUtil.isValidDateFormat(
          "2025-06-15T09:00:00",
          DATE_FORMAT.DATETIME_UTC,
        ),
      ).toBe(false);
    });

    it("should validate DATETIME_OFFSET format (offset, no ms)", () => {
      expect(
        DayjsUtil.isValidDateFormat(
          "2025-06-15T09:00:00+09:00",
          DATE_FORMAT.DATETIME_OFFSET,
        ),
      ).toBe(true);
      expect(
        DayjsUtil.isValidDateFormat(
          "2025-06-15T09:00:00-05:00",
          DATE_FORMAT.DATETIME_OFFSET,
        ),
      ).toBe(true);
      expect(
        DayjsUtil.isValidDateFormat(
          "2025-06-15T09:00:00Z",
          DATE_FORMAT.DATETIME_OFFSET,
        ),
      ).toBe(false);
    });

    it("should validate DATETIME_MS_UTC format (.toISOString() output)", () => {
      expect(
        DayjsUtil.isValidDateFormat(
          "2025-06-15T09:00:00.000Z",
          DATE_FORMAT.DATETIME_MS_UTC,
        ),
      ).toBe(true);
      expect(
        DayjsUtil.isValidDateFormat(
          "2025-06-15T09:00:00Z",
          DATE_FORMAT.DATETIME_MS_UTC,
        ),
      ).toBe(false);
      expect(
        DayjsUtil.isValidDateFormat(
          "2025-06-15T09:00:00.000+09:00",
          DATE_FORMAT.DATETIME_MS_UTC,
        ),
      ).toBe(false);
    });

    it("should validate DATETIME_MS_OFFSET format (full precision with offset)", () => {
      expect(
        DayjsUtil.isValidDateFormat(
          "2025-06-15T09:00:00.000+09:00",
          DATE_FORMAT.DATETIME_MS_OFFSET,
        ),
      ).toBe(true);
      expect(
        DayjsUtil.isValidDateFormat(
          "2025-06-15T09:00:00.000Z",
          DATE_FORMAT.DATETIME_MS_OFFSET,
        ),
      ).toBe(false);
    });
  });

  // ─── DST Transition Tests ────────────────────────────────────────

  describe("DST transitions", () => {
    it("should handle US spring-forward (March 2025)", () => {
      // US DST: clocks spring forward at 2:00 AM → 3:00 AM on March 9, 2025
      const beforeDST = DayjsUtil.tzParse(
        "2025-03-09 01:30:00",
        "America/New_York",
      );
      const afterDST = DayjsUtil.tzParse(
        "2025-03-09 03:30:00",
        "America/New_York",
      );

      // Before: EST (UTC-5), After: EDT (UTC-4)
      const beforeUTC = beforeDST.utc().format("HH:mm");
      const afterUTC = afterDST.utc().format("HH:mm");
      expect(beforeUTC).toBe("06:30"); // 01:30 + 5h
      expect(afterUTC).toBe("07:30"); // 03:30 + 4h
    });

    it("should handle US fall-back (November 2025)", () => {
      // US DST: clocks fall back at 2:00 AM → 1:00 AM on November 2, 2025
      const beforeFallback = DayjsUtil.tzParse(
        "2025-11-02 00:30:00",
        "America/New_York",
      );
      const afterFallback = DayjsUtil.tzParse(
        "2025-11-02 02:30:00",
        "America/New_York",
      );

      // Before: EDT (UTC-4), After: EST (UTC-5)
      const beforeUTC = beforeFallback.utc().format("HH:mm");
      const afterUTC = afterFallback.utc().format("HH:mm");
      expect(beforeUTC).toBe("04:30"); // 00:30 + 4h (still EDT)
      expect(afterUTC).toBe("07:30"); // 02:30 + 5h (now EST)
    });

    it("should handle tz() correctly across DST boundary", () => {
      // A UTC time that falls during the DST transition window
      const utcTime = "2025-03-09T07:00:00Z"; // 3:00 AM EDT (after spring forward)
      const result = DayjsUtil.tz(utcTime, "America/New_York");
      expect(result.format("HH:mm")).toBe("03:00");
    });
  });

  // ─── Invalid Input Tests ─────────────────────────────────────────

  describe("invalid inputs", () => {
    it("should handle undefined gracefully", () => {
      expect(DayjsUtil.formatUTCString(undefined)).toMatch(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/,
      );
      expect(DayjsUtil.utc(undefined).isValid()).toBe(true);
    });

    it("should handle empty string", () => {
      const result = DayjsUtil.utc("");
      // dayjs("") returns Invalid Date
      expect(result.isValid()).toBe(false);
    });

    it("should handle malformed date string", () => {
      const result = DayjsUtil.utc("not-a-date");
      expect(result.isValid()).toBe(false);
    });

    it("extractDateOnlyString should return current date for empty string", () => {
      const result = DayjsUtil.extractDateOnlyString("");
      // Empty string is falsy → returns current UTC date
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("convertToUTCDate should return a Date even for invalid input", () => {
      const result = DayjsUtil.convertToUTCDate("garbage");
      expect(result).toBeInstanceOf(Date);
      // Invalid Date has NaN time
      expect(isNaN(result.getTime())).toBe(true);
    });
  });
});

// ─── EventDateHandler ────────────────────────────────────────────

describe(EventDateHandler.name, () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should process null time input", () => {
    const result = EventDateHandler.computeScheduleDates({
      startAt: undefined,
      endAt: undefined,
      timeZone: UTC,
    });
    expect(result[0]).toBe(null);
    expect(result[1]).toBe(null);
    expect(result[2]).toBe(UTC);
  });

  describe("computeScheduleDates", () => {
    it("should process all-day event dates correctly", () => {
      const result = EventDateHandler.computeScheduleDates({
        startAt: "2025-08-15T00:00:00",
        endAt: "2025-08-16T00:00:00",
        timeZone: UTC,
        isAllDay: true,
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toBeInstanceOf(Date);
      expect(result[1]).toBeInstanceOf(Date);
      expect(result[2]).toBe(UTC);
    });

    it("should handle timed events with timezone", () => {
      const timezone = "America/New_York";
      const result = EventDateHandler.computeScheduleDates({
        startAt: "2025-08-15T10:00:00",
        endAt: "2025-08-15T11:00:00",
        timeZone: timezone,
        isAllDay: false,
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toBeInstanceOf(Date);
      expect(result[1]).toBeInstanceOf(Date);
      expect(result[2]).toBe(timezone);
    });

    it("should preserve time for all-day events (strip timezone)", () => {
      const result = EventDateHandler.computeScheduleDates({
        startAt: "2025-08-15T00:00:00+09:00",
        endAt: "2025-08-16T00:00:00+09:00",
        timeZone: "Asia/Seoul",
        isAllDay: true,
      });

      // All-day: time preserved as-is, timezone stripped
      expect(result[0]?.toISOString()).toBe("2025-08-15T00:00:00.000Z");
      expect(result[1]?.toISOString()).toBe("2025-08-16T00:00:00.000Z");
      expect(result[2]).toBe(UTC);
    });
  });

  describe(EventDateHandler.processAllDayEventDates.name, () => {
    it("should strip timezone and preserve time", () => {
      const result = EventDateHandler.processAllDayEventDates(
        "2025-06-15T00:00:00+09:00",
        "2025-06-16T00:00:00+09:00",
      );

      expect(result.startAt.toISOString()).toBe("2025-06-15T00:00:00.000Z");
      expect(result.endAt.toISOString()).toBe("2025-06-16T00:00:00.000Z");
      expect(result.zone).toBe(UTC);
    });
  });

  describe(EventDateHandler.processTimedEventDates.name, () => {
    it("should convert to UTC", () => {
      const result = EventDateHandler.processTimedEventDates(
        "2025-06-15T09:00:00+09:00",
        "2025-06-15T10:00:00+09:00",
        "Asia/Seoul",
      );

      expect(result.startAt.toISOString()).toBe("2025-06-15T00:00:00.000Z");
      expect(result.endAt.toISOString()).toBe("2025-06-15T01:00:00.000Z");
      expect(result.zone).toBe("Asia/Seoul");
    });
  });
});
