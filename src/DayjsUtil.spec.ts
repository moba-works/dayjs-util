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
      // In KST these are different days; must pass timezone for correct comparison
      expect(DayjsUtil.isSame(d1, d2, "day", "Asia/Seoul")).toBe(false);
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

  // ─── isBefore / isAfter ─────────────────────────────────────────

  describe(DayjsUtil.isBefore.name, () => {
    it("should return true when date1 is before date2", () => {
      expect(
        DayjsUtil.isBefore(
          "2025-06-15T08:00:00+09:00",
          "2025-06-15T09:00:00+09:00",
        ),
      ).toBe(true);
    });

    it("should return false when date1 is after date2", () => {
      expect(
        DayjsUtil.isBefore(
          "2025-06-15T10:00:00+09:00",
          "2025-06-15T09:00:00+09:00",
        ),
      ).toBe(false);
    });

    it("should return false when dates are equal", () => {
      expect(
        DayjsUtil.isBefore(
          "2025-06-15T09:00:00+09:00",
          "2025-06-15T09:00:00+09:00",
        ),
      ).toBe(false);
    });

    it("should compare at day granularity", () => {
      expect(
        DayjsUtil.isBefore(
          "2025-06-14T23:59:59Z",
          "2025-06-15T00:00:00Z",
          "day",
        ),
      ).toBe(true);
      expect(
        DayjsUtil.isBefore(
          "2025-06-15T01:00:00Z",
          "2025-06-15T23:00:00Z",
          "day",
        ),
      ).toBe(false);
    });
  });

  describe(DayjsUtil.isAfter.name, () => {
    it("should return true when date1 is after date2", () => {
      expect(
        DayjsUtil.isAfter(
          "2025-06-15T10:00:00+09:00",
          "2025-06-15T09:00:00+09:00",
        ),
      ).toBe(true);
    });

    it("should return false when date1 is before date2", () => {
      expect(
        DayjsUtil.isAfter(
          "2025-06-15T08:00:00+09:00",
          "2025-06-15T09:00:00+09:00",
        ),
      ).toBe(false);
    });

    it("should compare at month granularity", () => {
      expect(
        DayjsUtil.isAfter(
          "2025-07-01T00:00:00Z",
          "2025-06-30T23:59:59Z",
          "month",
        ),
      ).toBe(true);
    });
  });

  // ─── formatString ────────────────────────────────────────────────

  describe(DayjsUtil.formatString.name, () => {
    it("should format with custom template in UTC", () => {
      const result = DayjsUtil.formatString(
        "2025-06-15T00:00:00Z",
        "YYYY/MM/DD HH:mm",
      );
      expect(result).toBe("2025/06/15 00:00");
    });

    it("should format in specified timezone", () => {
      const result = DayjsUtil.formatString(
        "2025-06-15T00:00:00Z",
        "YYYY-MM-DD HH:mm",
        "Asia/Seoul",
      );
      expect(result).toBe("2025-06-15 09:00");
    });

    it("should handle time-only format", () => {
      const result = DayjsUtil.formatString("2025-06-15T15:30:45Z", "hh:mm A");
      expect(result).toBe("03:30 PM");
    });
  });

  // ─── startOf / endOf ────────────────────────────────────────────

  describe(DayjsUtil.startOf.name, () => {
    it("should return start of day in UTC", () => {
      const result = DayjsUtil.startOf("2025-06-15T14:30:00Z", "day");
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-06-15 00:00:00");
    });

    it("should return start of day in specified timezone", () => {
      // 2025-06-15 02:00 UTC = 2025-06-15 11:00 KST
      const result = DayjsUtil.startOf(
        "2025-06-15T02:00:00Z",
        "day",
        "Asia/Seoul",
      );
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-06-15 00:00:00");
    });

    it("should return start of month", () => {
      const result = DayjsUtil.startOf("2025-06-15T14:30:00Z", "month");
      expect(result.format("YYYY-MM-DD")).toBe("2025-06-01");
    });

    it("should handle timezone where date differs from UTC", () => {
      // 2025-06-14T20:00 UTC = 2025-06-15T05:00 KST
      const result = DayjsUtil.startOf(
        "2025-06-14T20:00:00Z",
        "day",
        "Asia/Seoul",
      );
      // In KST, this is June 15 — startOf('day') should give June 15 00:00 KST
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-06-15 00:00:00");
    });

    it("should handle DST spring-forward boundary", () => {
      // US spring forward March 9, 2025: 2:00 AM → 3:00 AM EDT
      const result = DayjsUtil.startOf(
        "2025-03-09T12:00:00-04:00",
        "day",
        "America/New_York",
      );
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-03-09 00:00:00");
    });

    it("should handle DST fall-back boundary", () => {
      // US fall back November 2, 2025: 2:00 AM → 1:00 AM EST
      const result = DayjsUtil.startOf(
        "2025-11-02T12:00:00-05:00",
        "day",
        "America/New_York",
      );
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-11-02 00:00:00");
    });
  });

  describe(DayjsUtil.endOf.name, () => {
    it("should return end of day in UTC", () => {
      const result = DayjsUtil.endOf("2025-06-15T14:30:00Z", "day");
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-06-15 23:59:59");
    });

    it("should return end of month", () => {
      const result = DayjsUtil.endOf("2025-06-15T14:30:00Z", "month");
      expect(result.format("YYYY-MM-DD")).toBe("2025-06-30");
    });

    it("should return end of day in timezone", () => {
      const result = DayjsUtil.endOf(
        "2025-06-15T00:00:00Z",
        "day",
        "Asia/Seoul",
      );
      // In KST, this is June 15 09:00 — endOf('day') gives June 15 23:59:59 KST
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-06-15 23:59:59");
    });

    it("should handle DST spring-forward boundary", () => {
      const result = DayjsUtil.endOf(
        "2025-03-09T12:00:00-04:00",
        "day",
        "America/New_York",
      );
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-03-09 23:59:59");
    });
  });

  // ─── add / subtract ────────────────────────────────────────────

  describe(DayjsUtil.add.name, () => {
    it("should add days", () => {
      const result = DayjsUtil.add("2025-06-15T09:00:00Z", 3, "day");
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-06-18 09:00:00");
    });

    it("should add hours", () => {
      const result = DayjsUtil.add("2025-06-15T09:00:00Z", 2, "hour");
      expect(result.format("HH:mm")).toBe("11:00");
    });

    it("should add months and handle month-end rollover", () => {
      const result = DayjsUtil.add("2025-01-31T12:00:00Z", 1, "month");
      // Jan 31 + 1 month = Feb 28 (2025 is not a leap year)
      expect(result.format("YYYY-MM-DD")).toBe("2025-02-28");
    });

    it("should preserve wall-clock time across DST in timezone", () => {
      // US spring forward: March 9, 2025 — clocks skip 2:00 AM → 3:00 AM
      const result = DayjsUtil.add(
        "2025-03-08T10:00:00-05:00", // 10 AM EST
        1,
        "day",
        "America/New_York",
      );
      // Should be 10 AM EDT the next day, not 11 AM
      expect(result.format("HH:mm")).toBe("10:00");
    });
  });

  describe(DayjsUtil.subtract.name, () => {
    it("should subtract days", () => {
      const result = DayjsUtil.subtract("2025-06-15T09:00:00Z", 5, "day");
      expect(result.format("YYYY-MM-DD")).toBe("2025-06-10");
    });

    it("should subtract months", () => {
      const result = DayjsUtil.subtract("2025-03-31T12:00:00Z", 1, "month");
      // March 31 - 1 month = Feb 28
      expect(result.format("YYYY-MM-DD")).toBe("2025-02-28");
    });

    it("should subtract with timezone", () => {
      const result = DayjsUtil.subtract(
        "2025-06-15T00:00:00Z",
        1,
        "day",
        "Asia/Seoul",
      );
      // UTC midnight = KST 09:00 June 15. Subtract 1 day = KST 09:00 June 14
      expect(result.format("YYYY-MM-DD HH:mm")).toBe("2025-06-14 09:00");
    });
  });

  // ─── now ────────────────────────────────────────────────────────

  describe(DayjsUtil.now.name, () => {
    it("should return a valid Dayjs object", () => {
      const result = DayjsUtil.now();
      expect(result.isValid()).toBe(true);
    });

    it("should return current time close to Date.now()", () => {
      const before = Date.now();
      const result = DayjsUtil.now();
      const after = Date.now();
      expect(result.valueOf()).toBeGreaterThanOrEqual(before);
      expect(result.valueOf()).toBeLessThanOrEqual(after);
    });

    it("should respect timezone", () => {
      const utcNow = DayjsUtil.now();
      const seoulNow = DayjsUtil.now("Asia/Seoul");
      // Same instant, different display — offset should differ by 9 hours
      expect(seoulNow.utcOffset()).toBe(9 * 60);
      expect(utcNow.utcOffset()).toBe(0);
    });
  });

  // ─── isSameOrBefore / isSameOrAfter ─────────────────────────────

  describe(DayjsUtil.isSameOrBefore.name, () => {
    it("should return true when date1 is before date2", () => {
      expect(
        DayjsUtil.isSameOrBefore(
          "2025-06-14T00:00:00Z",
          "2025-06-15T00:00:00Z",
        ),
      ).toBe(true);
    });

    it("should return true when dates are equal", () => {
      expect(
        DayjsUtil.isSameOrBefore(
          "2025-06-15T00:00:00Z",
          "2025-06-15T00:00:00Z",
        ),
      ).toBe(true);
    });

    it("should return false when date1 is after date2", () => {
      expect(
        DayjsUtil.isSameOrBefore(
          "2025-06-16T00:00:00Z",
          "2025-06-15T00:00:00Z",
        ),
      ).toBe(false);
    });

    it("should compare at day granularity", () => {
      expect(
        DayjsUtil.isSameOrBefore(
          "2025-06-15T23:59:59Z",
          "2025-06-15T00:00:00Z",
          "day",
        ),
      ).toBe(true);
    });

    it("should respect timezone for day comparison", () => {
      // 2025-06-14T20:00 UTC = 2025-06-15T05:00 KST
      // In KST, both are June 15 → same day → isSameOrBefore is true
      expect(
        DayjsUtil.isSameOrBefore(
          "2025-06-14T20:00:00Z",
          "2025-06-15T00:00:00Z",
          "day",
          "Asia/Seoul",
        ),
      ).toBe(true);
    });
  });

  describe(DayjsUtil.isSameOrAfter.name, () => {
    it("should return true when date1 is after date2", () => {
      expect(
        DayjsUtil.isSameOrAfter("2025-06-16T00:00:00Z", "2025-06-15T00:00:00Z"),
      ).toBe(true);
    });

    it("should return true when dates are equal", () => {
      expect(
        DayjsUtil.isSameOrAfter("2025-06-15T00:00:00Z", "2025-06-15T00:00:00Z"),
      ).toBe(true);
    });

    it("should return false when date1 is before date2", () => {
      expect(
        DayjsUtil.isSameOrAfter("2025-06-14T00:00:00Z", "2025-06-15T00:00:00Z"),
      ).toBe(false);
    });

    it("should respect timezone for day comparison", () => {
      // 2025-06-15T16:00 UTC = 2025-06-16T01:00 KST
      // In KST, date1 is June 16 which is after June 15 → true
      expect(
        DayjsUtil.isSameOrAfter(
          "2025-06-15T16:00:00Z",
          "2025-06-15T00:00:00Z",
          "day",
          "Asia/Seoul",
        ),
      ).toBe(true);
    });
  });

  // ─── isBetween ──────────────────────────────────────────────────

  describe(DayjsUtil.isBetween.name, () => {
    const start = "2025-06-10T00:00:00Z";
    const end = "2025-06-20T00:00:00Z";

    it("should return true for date within range (exclusive by default)", () => {
      expect(DayjsUtil.isBetween("2025-06-15T00:00:00Z", start, end)).toBe(
        true,
      );
    });

    it("should return false for date outside range", () => {
      expect(DayjsUtil.isBetween("2025-06-25T00:00:00Z", start, end)).toBe(
        false,
      );
    });

    it("should exclude boundaries with '()' inclusivity", () => {
      expect(DayjsUtil.isBetween(start, start, end, null, "()")).toBe(false);
      expect(DayjsUtil.isBetween(end, start, end, null, "()")).toBe(false);
    });

    it("should include boundaries with '[]' inclusivity", () => {
      expect(DayjsUtil.isBetween(start, start, end, null, "[]")).toBe(true);
      expect(DayjsUtil.isBetween(end, start, end, null, "[]")).toBe(true);
    });

    it("should support mixed inclusivity '[)'", () => {
      expect(DayjsUtil.isBetween(start, start, end, null, "[)")).toBe(true);
      expect(DayjsUtil.isBetween(end, start, end, null, "[)")).toBe(false);
    });

    it("should compare at day granularity", () => {
      expect(
        DayjsUtil.isBetween(
          "2025-06-15T23:59:59Z",
          "2025-06-15T00:00:00Z",
          "2025-06-20T00:00:00Z",
          "day",
          "[]",
        ),
      ).toBe(true);
    });

    it("should respect timezone for day-level range check", () => {
      // 2025-06-14T20:00 UTC = 2025-06-15T05:00 KST
      // In KST, this is June 15 — between June 10 and June 20
      expect(
        DayjsUtil.isBetween(
          "2025-06-14T20:00:00Z",
          "2025-06-15T00:00:00Z",
          "2025-06-20T00:00:00Z",
          "day",
          "[]",
          "Asia/Seoul",
        ),
      ).toBe(true);
    });
  });

  // ─── startOfDate / endOfDate ────────────────────────────────────

  describe(DayjsUtil.startOfDate.name, () => {
    it("should return a JS Date at start of day", () => {
      const result = DayjsUtil.startOfDate("2025-06-15T14:30:00Z", "day");
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe("2025-06-15T00:00:00.000Z");
    });

    it("should return start of month as Date", () => {
      const result = DayjsUtil.startOfDate("2025-06-15T14:30:00Z", "month");
      expect(result.toISOString()).toBe("2025-06-01T00:00:00.000Z");
    });
  });

  describe(DayjsUtil.endOfDate.name, () => {
    it("should return a JS Date at end of day", () => {
      const result = DayjsUtil.endOfDate("2025-06-15T14:30:00Z", "day");
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe("2025-06-15T23:59:59.999Z");
    });
  });

  // ─── toUnixSeconds / toUnixMilliseconds ─────────────────────────

  describe(DayjsUtil.toUnixSeconds.name, () => {
    it("should return Unix timestamp in seconds", () => {
      const result = DayjsUtil.toUnixSeconds("2025-01-01T00:00:00Z");
      expect(result).toBe(1735689600);
    });

    it("should return 0 for epoch", () => {
      expect(DayjsUtil.toUnixSeconds("1970-01-01T00:00:00Z")).toBe(0);
    });
  });

  describe(DayjsUtil.toUnixMilliseconds.name, () => {
    it("should return Unix timestamp in milliseconds", () => {
      const result = DayjsUtil.toUnixMilliseconds("2025-01-01T00:00:00Z");
      expect(result).toBe(1735689600000);
    });

    it("should match Date.getTime()", () => {
      const date = new Date("2025-06-15T09:00:00Z");
      expect(DayjsUtil.toUnixMilliseconds(date)).toBe(date.getTime());
    });
  });

  // ─── copyTime ───────────────────────────────────────────────────

  describe(DayjsUtil.copyTime.name, () => {
    it("should copy time from source to target date", () => {
      const result = DayjsUtil.copyTime(
        "2025-06-15T14:30:45Z", // source time: 14:30:45
        "2025-06-20T00:00:00Z", // target date: June 20
      );
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-06-20 14:30:45");
    });

    it("should preserve target date while changing time", () => {
      const result = DayjsUtil.copyTime(
        "2025-01-01T08:15:00Z",
        "2025-12-25T23:59:59Z",
      );
      expect(result.format("YYYY-MM-DD")).toBe("2025-12-25");
      expect(result.format("HH:mm:ss")).toBe("08:15:00");
    });

    it("should work with timezone (UTC → KST)", () => {
      const result = DayjsUtil.copyTime(
        "2025-06-15T00:00:00Z", // UTC midnight = KST 09:00
        "2025-06-20T12:00:00Z", // UTC noon = KST 21:00
        "Asia/Seoul",
      );
      // In KST: source is 09:00, target date is June 20
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-06-20 09:00:00");
    });

    it("should work with timezone (KST → UTC direction)", () => {
      const result = DayjsUtil.copyTime(
        "2025-06-15T15:00:00Z", // UTC 15:00 = KST 00:00 (midnight)
        "2025-06-20T03:00:00Z", // UTC 03:00 = KST 12:00
        "Asia/Seoul",
      );
      // In KST: source is 00:00, target date is June 20
      expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-06-20 00:00:00");
    });

    it("should copy milliseconds correctly", () => {
      const result = DayjsUtil.copyTime(
        "2025-06-15T14:30:45.123Z", // source with milliseconds
        "2025-06-20T00:00:00Z",
      );
      expect(result.format("YYYY-MM-DD HH:mm:ss.SSS")).toBe(
        "2025-06-20 14:30:45.123",
      );
    });
  });

  // ─── isMidnight ─────────────────────────────────────────────────

  describe(DayjsUtil.isMidnight.name, () => {
    it("should return true for midnight UTC", () => {
      expect(DayjsUtil.isMidnight("2025-06-15T00:00:00Z")).toBe(true);
    });

    it("should return false for non-midnight", () => {
      expect(DayjsUtil.isMidnight("2025-06-15T00:00:01Z")).toBe(false);
    });

    it("should check midnight in specified timezone", () => {
      // 2025-06-14T15:00:00Z = 2025-06-15T00:00:00 KST (midnight in Seoul)
      expect(DayjsUtil.isMidnight("2025-06-14T15:00:00Z", "Asia/Seoul")).toBe(
        true,
      );
    });

    it("should return false for midnight UTC when checking different timezone", () => {
      // UTC midnight is 09:00 in Seoul — not midnight
      expect(DayjsUtil.isMidnight("2025-06-15T00:00:00Z", "Asia/Seoul")).toBe(
        false,
      );
    });
  });

  // ─── formatDurationString ───────────────────────────────────────

  describe(DayjsUtil.formatDurationString.name, () => {
    it("should format hours and minutes (short)", () => {
      const ms = (2 * 60 + 30) * 60 * 1000; // 2h 30min
      expect(DayjsUtil.formatDurationString(ms)).toBe("2h 30min");
    });

    it("should format hours and minutes (long)", () => {
      const ms = (2 * 60 + 30) * 60 * 1000;
      expect(DayjsUtil.formatDurationString(ms, { short: false })).toBe(
        "2 hours 30 minutes",
      );
    });

    it("should handle hours only", () => {
      const ms = 3 * 60 * 60 * 1000;
      expect(DayjsUtil.formatDurationString(ms)).toBe("3h");
    });

    it("should handle minutes only", () => {
      const ms = 45 * 60 * 1000;
      expect(DayjsUtil.formatDurationString(ms)).toBe("45min");
    });

    it("should handle zero duration", () => {
      expect(DayjsUtil.formatDurationString(0)).toBe("0min");
      expect(DayjsUtil.formatDurationString(0, { short: false })).toBe(
        "0 minutes",
      );
    });

    it("should handle singular forms (long)", () => {
      const oneHour = 60 * 60 * 1000;
      const oneMin = 60 * 1000;
      expect(DayjsUtil.formatDurationString(oneHour, { short: false })).toBe(
        "1 hour",
      );
      expect(DayjsUtil.formatDurationString(oneMin, { short: false })).toBe(
        "1 minute",
      );
    });

    it("should handle large durations (>24h)", () => {
      const ms = 26 * 60 * 60 * 1000 + 15 * 60 * 1000; // 26h 15min
      expect(DayjsUtil.formatDurationString(ms)).toBe("26h 15min");
    });

    it("should handle sub-minute durations as zero", () => {
      // 30 seconds — not enough for a full minute
      expect(DayjsUtil.formatDurationString(30_000)).toBe("0min");
    });

    it("should treat negative durations as absolute value", () => {
      expect(DayjsUtil.formatDurationString(-60_000)).toBe("1min");
      expect(DayjsUtil.formatDurationString(-3_600_000)).toBe("1h");
    });
  });

  // ─── dayOfWeekString ────────────────────────────────────────────

  describe(DayjsUtil.dayOfWeekString.name, () => {
    it("should return correct RRULE day code", () => {
      // June 15, 2025 is a Sunday
      expect(DayjsUtil.dayOfWeekString("2025-06-15T00:00:00Z")).toBe("SU");
      // June 16, 2025 is a Monday
      expect(DayjsUtil.dayOfWeekString("2025-06-16T00:00:00Z")).toBe("MO");
      // June 17, 2025 is a Tuesday
      expect(DayjsUtil.dayOfWeekString("2025-06-17T00:00:00Z")).toBe("TU");
      // June 18, 2025 is a Wednesday
      expect(DayjsUtil.dayOfWeekString("2025-06-18T00:00:00Z")).toBe("WE");
      // June 19, 2025 is a Thursday
      expect(DayjsUtil.dayOfWeekString("2025-06-19T00:00:00Z")).toBe("TH");
      // June 20, 2025 is a Friday
      expect(DayjsUtil.dayOfWeekString("2025-06-20T00:00:00Z")).toBe("FR");
      // June 21, 2025 is a Saturday
      expect(DayjsUtil.dayOfWeekString("2025-06-21T00:00:00Z")).toBe("SA");
    });

    it("should respect timezone when day differs", () => {
      // 2025-06-14T20:00 UTC = 2025-06-15T05:00 KST
      // June 14 is Saturday in UTC, June 15 is Sunday in KST
      expect(DayjsUtil.dayOfWeekString("2025-06-14T20:00:00Z")).toBe("SA");
      expect(
        DayjsUtil.dayOfWeekString("2025-06-14T20:00:00Z", "Asia/Seoul"),
      ).toBe("SU");
    });

    it("should throw RangeError for invalid date input", () => {
      expect(() => DayjsUtil.dayOfWeekString("not-a-date")).toThrow(RangeError);
    });
  });

  // ─── remainingDays ──────────────────────────────────────────────

  describe(DayjsUtil.remainingDays.name, () => {
    it("should return exact day count for whole days", () => {
      expect(
        DayjsUtil.remainingDays("2025-06-15T00:00:00Z", "2025-06-20T00:00:00Z"),
      ).toBe(5);
    });

    it("should round up partial days", () => {
      // 5 days + 1 hour → should be 6
      expect(
        DayjsUtil.remainingDays("2025-06-15T00:00:00Z", "2025-06-20T01:00:00Z"),
      ).toBe(6);
    });

    it("should return 0 for same instant", () => {
      expect(
        DayjsUtil.remainingDays("2025-06-15T00:00:00Z", "2025-06-15T00:00:00Z"),
      ).toBe(0);
    });

    it("should return negative for past dates", () => {
      expect(
        DayjsUtil.remainingDays("2025-06-20T00:00:00Z", "2025-06-15T00:00:00Z"),
      ).toBe(-5);
    });

    it("should return -1 for sub-day negative intervals", () => {
      // 1 hour in the past → should be -1, not 0
      expect(
        DayjsUtil.remainingDays("2025-06-15T01:00:00Z", "2025-06-15T00:00:00Z"),
      ).toBe(-1);
    });

    it("should round up even for tiny remainders", () => {
      // 1 millisecond past midnight → should be 1 day remaining
      expect(
        DayjsUtil.remainingDays(
          "2025-06-15T00:00:00Z",
          "2025-06-15T00:00:00.001Z",
        ),
      ).toBe(1);
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
