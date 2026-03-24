import dayjs, { Dayjs, OpUnitType } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { FORMAT_PATTERNS, UTC } from "./constants";
import type { DateFormat } from "./constants";
import type { DateInput, TimezoneString } from "./types";

/**
 * Plugin extensions — loaded ONCE at module import time.
 * This is the only initialization; it is idempotent and optimal.
 */
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);

/**
 * Static utility class for date and time operations.
 *
 * Use DayjsUtil for ALL date operations. Never use `new Date()` directly.
 *
 * Key design decisions:
 * - Static class (not singleton) — dayjs instances are created per-call by design
 * - Immutable operations — safe chaining without side effects
 * - Explicit timezone handling — no ambiguity
 */
export class DayjsUtil {
  private static readonly ISO_FORMAT_WITH_OFFSET = "YYYY-MM-DDTHH:mm:ssZ";
  private static readonly UTC_FORMAT = "YYYY-MM-DDTHH:mm:ss[Z]";
  private static readonly DATE_ONLY_FORMAT = "YYYY-MM-DD";

  // ─── Formatting Methods ──────────────────────────────────────────

  /**
   * Format to ISO string with timezone.
   * @param date - Date to format
   * @param timezone - Timezone for formatting (null = UTC)
   * @returns ISO formatted string (e.g., "2025-05-09T03:00:00+09:00")
   */
  static formatISOString(date?: DateInput, timezone?: TimezoneString): string {
    const tz = timezone ?? UTC;
    return dayjs(date).tz(tz).format(this.ISO_FORMAT_WITH_OFFSET);
  }

  /**
   * Format to UTC ISO string.
   * @param date - Date to format
   * @returns UTC formatted string (e.g., "2025-05-09T03:00:00Z")
   */
  static formatUTCString(date?: DateInput): string {
    return dayjs(date).utc().format(this.UTC_FORMAT);
  }

  /**
   * Format date only (no time), respecting timezone.
   * @param date - Date to format
   * @param timezone - Timezone for date extraction (null = UTC)
   * @returns Date string (e.g., "2025-05-09")
   */
  static formatDateOnlyString(
    date?: DateInput,
    timezone?: TimezoneString,
  ): string {
    const tz = timezone ?? UTC;
    return dayjs(date).tz(tz).format(this.DATE_ONLY_FORMAT);
  }

  /**
   * Extract date part without timezone conversion.
   *
   * For string inputs, extracts the date as it appears in the string
   * regardless of server timezone. Critical for all-day events where
   * the date must match the original timezone, not the server's.
   *
   * @param date - Any date input
   * @returns Date string (e.g., "2025-05-09")
   */
  static extractDateOnlyString(date?: DateInput): string {
    if (!date) {
      return dayjs.utc().format(this.DATE_ONLY_FORMAT);
    }

    // For strings, extract the date part directly — no timezone conversion
    if (typeof date === "string") {
      const dateMatch = date.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch && dateMatch[1]) {
        return dateMatch[1];
      }

      const altMatch = date.match(/(\d{4}-\d{2}-\d{2})/);
      if (altMatch && altMatch[1]) {
        return altMatch[1];
      }
    }

    // For Date objects, format in UTC to avoid server timezone shift
    if (date instanceof Date) {
      return dayjs.utc(date).format(this.DATE_ONLY_FORMAT);
    }

    // For Dayjs objects, format in their existing timezone
    if (dayjs.isDayjs(date)) {
      return date.format(this.DATE_ONLY_FORMAT);
    }

    // Fallback: stringify and try to extract
    const stringified = String(date);
    const fallbackMatch = stringified.match(/(\d{4}-\d{2}-\d{2})/);
    if (fallbackMatch && fallbackMatch[1]) {
      return fallbackMatch[1];
    }

    // Last resort — current UTC date (not local timezone)
    return dayjs.utc().format(this.DATE_ONLY_FORMAT);
  }

  // ─── Parsing Methods ─────────────────────────────────────────────

  /**
   * Parse a date string with optional timezone.
   * @param dateString - ISO 8601 format date string
   * @param timezone - Target timezone (null = UTC)
   * @returns Dayjs object in specified timezone
   */
  static parseToTz(dateString?: string, timezone?: TimezoneString): Dayjs {
    const tz = timezone ?? UTC;
    return dayjs(dateString).tz(tz);
  }

  /**
   * Create a Dayjs object in UTC.
   * @param date - Input date (current time if not provided)
   * @returns Dayjs object in UTC
   */
  static utc(date?: DateInput): Dayjs {
    return dayjs.utc(date);
  }

  /**
   * Convert an existing date TO the specified timezone.
   *
   * WARNING: This converts, not parses. If you need to interpret a date
   * string AS being in a specific timezone, use tzParse() instead.
   *
   * @param date - Input date (current time if not provided)
   * @param timezone - Target timezone (null = UTC)
   * @returns Dayjs object in specified timezone
   *
   * @example
   * // Server is in UTC. Input: "2025-01-01 00:00:00"
   * DayjsUtil.tz("2025-01-01 00:00:00", "Asia/Seoul")
   * // Parses as 2025-01-01 00:00:00 UTC, displays as 2025-01-01 09:00:00 KST
   * // toDate() returns: 2025-01-01 00:00:00 UTC (same instant)
   */
  static tz(date?: DateInput, timezone?: TimezoneString): Dayjs {
    const tz = timezone ?? UTC;
    return dayjs(date).tz(tz);
  }

  /**
   * Parse a date string AS being in the specified timezone.
   *
   * CRITICAL DIFFERENCE from tz():
   * - tz(): Parses string in server's local timezone, then converts TO target timezone
   * - tzParse(): Parses string AS IF it were in the specified timezone
   *
   * @param dateString - Date string to parse (e.g., "2025-01-01 00:00:00")
   * @param timezone - Timezone the string represents (null = UTC)
   * @returns Dayjs object representing that moment in time
   *
   * @example
   * DayjsUtil.tzParse("2025-01-01 00:00:00", "Asia/Seoul")
   * // Returns: Dayjs representing 2025-01-01 00:00:00 KST
   * // toDate() returns: 2024-12-31 15:00:00 UTC (9 hours earlier)
   */
  static tzParse(dateString: string, timezone?: TimezoneString): Dayjs {
    const tz = timezone ?? UTC;
    return dayjs.tz(dateString, tz);
  }

  // ─── Conversion Methods ──────────────────────────────────────────

  /**
   * Convert to UTC Date object (timezone conversion happens).
   *
   * @example "2023-06-15T15:00:00+09:00" → Date("2023-06-15T06:00:00Z")
   * @param date - Date to convert
   * @returns JavaScript Date in UTC
   */
  static convertToUTCDate(date?: DateInput): Date {
    return dayjs.utc(date).toDate();
  }

  /**
   * Returns Unix epoch (1970-01-01T00:00:00Z) as Date object.
   *
   * Use case: Sentinel value for "not applicable" states.
   * @returns Date representing 1970-01-01T00:00:00.000Z
   */
  static epoch(): Date {
    return dayjs.utc(0).toDate();
  }

  /**
   * Preserve time components while setting timezone to UTC (no conversion).
   *
   * @example "2023-06-15T00:00:00+09:00" → Date("2023-06-15T00:00:00Z")
   *
   * Use case: All-day events where the time should remain constant
   * regardless of timezone.
   *
   * @param dateString - Date string with optional timezone offset
   * @returns JavaScript Date with same time values but in UTC
   */
  static stripTimezoneToUTC(dateString?: string): Date {
    if (!dateString) return dayjs.utc().toDate();

    // Remove timezone info (Z or +/-XX:XX format)
    const cleanDate = dateString.replace(/([+-]\d{2}:\d{2}|Z)$/, "");

    const d = dayjs(cleanDate);

    return dayjs
      .utc()
      .year(d.year())
      .month(d.month())
      .date(d.date())
      .hour(d.hour())
      .minute(d.minute())
      .second(d.second())
      .millisecond(d.millisecond())
      .toDate();
  }

  // ─── Comparison Methods ──────────────────────────────────────────

  /**
   * Compare two dates for equality.
   * @param date1 - First date
   * @param date2 - Second date
   * @param unit - Granularity of comparison (default: millisecond)
   */
  static isSame(
    date1?: DateInput,
    date2?: DateInput,
    unit?: OpUnitType,
  ): boolean {
    return dayjs(date1).isSame(date2, unit);
  }

  /**
   * Calculate difference between two dates.
   * @param date1 - First date
   * @param date2 - Second date
   * @param unit - Unit for difference (default: millisecond)
   * @returns Difference in the specified unit
   */
  static diff(date1?: DateInput, date2?: DateInput, unit?: OpUnitType): number {
    return dayjs(date1).diff(date2, unit);
  }

  // ─── Validation ──────────────────────────────────────────────────

  /**
   * Validate a date string against a known format pattern.
   * @param value - String to validate
   * @param format - Expected format from DATE_FORMAT constants
   * @returns true if the string matches the format pattern
   */
  static isValidDateFormat(value: string, format: DateFormat): boolean {
    const pattern = FORMAT_PATTERNS[format];
    if (!pattern) return false;
    return pattern.test(value);
  }
}

/** Re-export dayjs for advanced usage */
export { dayjs };
