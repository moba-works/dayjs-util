import dayjs, { Dayjs, ManipulateType, OpUnitType } from "dayjs";
import duration from "dayjs/plugin/duration";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { FORMAT_PATTERNS, RRULE_DAYS, UTC } from "./constants";
import type { DateFormat, RRuleDay } from "./constants";
import type { DateInput, TimezoneString } from "./types";

/**
 * Plugin extensions — loaded ONCE at module import time.
 * This is the only initialization; it is idempotent and optimal.
 */
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(duration);

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
   * @param timezone - Timezone for comparison (null = UTC). Matters when unit is 'day' or larger.
   */
  static isSame(
    date1?: DateInput,
    date2?: DateInput,
    unit?: OpUnitType,
    timezone?: TimezoneString,
  ): boolean {
    const tz = timezone ?? UTC;
    return dayjs(date1).tz(tz).isSame(dayjs(date2).tz(tz), unit);
  }

  /**
   * Calculate difference between two dates.
   * @param date1 - First date
   * @param date2 - Second date
   * @param unit - Unit for difference (default: millisecond)
   * @param timezone - Timezone for the calculation (null = UTC). Matters when unit is 'day' or larger.
   * @returns Difference in the specified unit
   */
  static diff(
    date1?: DateInput,
    date2?: DateInput,
    unit?: OpUnitType,
    timezone?: TimezoneString,
  ): number {
    const tz = timezone ?? UTC;
    return dayjs(date1).tz(tz).diff(dayjs(date2).tz(tz), unit);
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

  // ─── Comparison (extended) ──────────────────────────────────────

  /**
   * Check if date1 is before date2.
   * @param date1 - First date
   * @param date2 - Second date
   * @param unit - Granularity of comparison (default: millisecond)
   * @param timezone - Timezone for comparison (null = UTC). Matters when unit is 'day' or larger.
   *
   * @example
   * DayjsUtil.isBefore("2025-06-14", "2025-06-15") // true
   * DayjsUtil.isBefore("2025-06-15T23:00", "2025-06-15T01:00", "day") // false (same day)
   */
  static isBefore(
    date1?: DateInput,
    date2?: DateInput,
    unit?: OpUnitType,
    timezone?: TimezoneString,
  ): boolean {
    const tz = timezone ?? UTC;
    return dayjs(date1).tz(tz).isBefore(dayjs(date2).tz(tz), unit);
  }

  /**
   * Check if date1 is after date2.
   * @param date1 - First date
   * @param date2 - Second date
   * @param unit - Granularity of comparison (default: millisecond)
   * @param timezone - Timezone for comparison (null = UTC). Matters when unit is 'day' or larger.
   */
  static isAfter(
    date1?: DateInput,
    date2?: DateInput,
    unit?: OpUnitType,
    timezone?: TimezoneString,
  ): boolean {
    const tz = timezone ?? UTC;
    return dayjs(date1).tz(tz).isAfter(dayjs(date2).tz(tz), unit);
  }

  // ─── General Formatting ─────────────────────────────────────────

  /**
   * Format a date with a custom template string in the specified timezone.
   * @param date - Date to format (current time if omitted)
   * @param template - dayjs format template (e.g., "YYYY-MM-DD HH:mm")
   * @param timezone - Timezone for formatting (null = UTC)
   * @returns Formatted string
   *
   * @example
   * DayjsUtil.formatString("2025-06-15T00:00:00Z", "YYYY/MM/DD") // "2025/06/15"
   * DayjsUtil.formatString("2025-06-15T00:00:00Z", "HH:mm", "Asia/Seoul") // "09:00"
   */
  static formatString(
    date: DateInput | undefined,
    template: string,
    timezone?: TimezoneString,
  ): string {
    const tz = timezone ?? UTC;
    // NOTE: Uses tz() (convert TO timezone), not tzParse() (parse AS timezone).
    // For offset-less strings, use DayjsUtil.tzParse() first if needed. This is by design.
    return dayjs(date).tz(tz).format(template);
  }

  // ─── Boundary Methods ───────────────────────────────────────────

  /**
   * Get the start of a time unit in the specified timezone.
   *
   * Timezone is applied BEFORE the startOf calculation — this prevents
   * the common bug of computing midnight in UTC instead of the user's timezone.
   *
   * @param date - Input date
   * @param unit - Unit to compute start of (day, week, month, year, etc.)
   * @param timezone - Timezone for the boundary (null = UTC)
   * @returns Dayjs at the start of the unit in the specified timezone
   *
   * @example
   * // Get midnight in Seoul (not UTC midnight!)
   * DayjsUtil.startOf("2025-06-15T02:00:00Z", "day", "Asia/Seoul")
   * // → 2025-06-15 00:00:00 KST (= 2025-06-14T15:00:00Z)
   */
  static startOf(
    date: DateInput,
    unit: OpUnitType,
    timezone?: TimezoneString,
  ): Dayjs {
    const tz = timezone ?? UTC;
    return dayjs(date).tz(tz).startOf(unit);
  }

  /**
   * Get the end of a time unit in the specified timezone.
   *
   * Timezone is applied BEFORE the endOf calculation.
   *
   * @param date - Input date
   * @param unit - Unit to compute end of (day, week, month, year, etc.)
   * @param timezone - Timezone for the boundary (null = UTC)
   * @returns Dayjs at the end of the unit in the specified timezone
   */
  static endOf(
    date: DateInput,
    unit: OpUnitType,
    timezone?: TimezoneString,
  ): Dayjs {
    const tz = timezone ?? UTC;
    return dayjs(date).tz(tz).endOf(unit);
  }

  // ─── Arithmetic ─────────────────────────────────────────────────

  /**
   * Add time to a date, with operations performed in the specified timezone.
   *
   * DST-safe: adding 1 day across a DST boundary yields the same wall-clock
   * time the next day, not exactly 24 hours later.
   *
   * @param date - Base date
   * @param value - Amount to add
   * @param unit - Unit to add (day, month, year, hour, minute, etc.)
   * @param timezone - Timezone for the operation (null = UTC)
   * @returns New Dayjs with time added
   *
   * @example
   * DayjsUtil.add("2025-06-15T09:00:00Z", 3, "day") // June 18, 09:00 UTC
   * DayjsUtil.add("2025-01-31T00:00:00Z", 1, "month") // Feb 28 (auto-clamp)
   */
  static add(
    date: DateInput,
    value: number,
    unit: ManipulateType,
    timezone?: TimezoneString,
  ): Dayjs {
    const tz = timezone ?? UTC;
    return dayjs(date).tz(tz).add(value, unit);
  }

  /**
   * Subtract time from a date, with operations performed in the specified timezone.
   *
   * DST-safe: same wall-clock time preservation as add().
   *
   * @param date - Base date
   * @param value - Amount to subtract
   * @param unit - Unit to subtract (day, month, year, hour, minute, etc.)
   * @param timezone - Timezone for the operation (null = UTC)
   * @returns New Dayjs with time subtracted
   */
  static subtract(
    date: DateInput,
    value: number,
    unit: ManipulateType,
    timezone?: TimezoneString,
  ): Dayjs {
    const tz = timezone ?? UTC;
    return dayjs(date).tz(tz).subtract(value, unit);
  }

  // ─── Current Time ───────────────────────────────────────────────

  /**
   * Get the current moment in the specified timezone.
   * @param timezone - Timezone (null = UTC)
   * @returns Dayjs representing "now" in the specified timezone
   */
  static now(timezone?: TimezoneString): Dayjs {
    const tz = timezone ?? UTC;
    return dayjs().tz(tz);
  }

  // ─── Range Checks ───────────────────────────────────────────────

  /**
   * Check if date1 is the same as or before date2.
   * @param date1 - First date
   * @param date2 - Second date
   * @param unit - Granularity of comparison (default: millisecond)
   * @param timezone - Timezone for comparison (null = UTC)
   */
  static isSameOrBefore(
    date1?: DateInput,
    date2?: DateInput,
    unit?: OpUnitType,
    timezone?: TimezoneString,
  ): boolean {
    const tz = timezone ?? UTC;
    return dayjs(date1).tz(tz).isSameOrBefore(dayjs(date2).tz(tz), unit);
  }

  /**
   * Check if date1 is the same as or after date2.
   * @param date1 - First date
   * @param date2 - Second date
   * @param unit - Granularity of comparison (default: millisecond)
   * @param timezone - Timezone for comparison (null = UTC)
   */
  static isSameOrAfter(
    date1?: DateInput,
    date2?: DateInput,
    unit?: OpUnitType,
    timezone?: TimezoneString,
  ): boolean {
    const tz = timezone ?? UTC;
    return dayjs(date1).tz(tz).isSameOrAfter(dayjs(date2).tz(tz), unit);
  }

  /**
   * Check if a date falls between two other dates.
   * @param date - Date to check
   * @param start - Range start
   * @param end - Range end
   * @param unit - Granularity (null = millisecond)
   * @param inclusivity - Bracket notation (default: "()" exclusive on both ends)
   * @param timezone - Timezone for comparison (null = UTC)
   *
   * @example
   * // Check if event falls within calendar view range (inclusive)
   * DayjsUtil.isBetween("2025-06-15", "2025-06-01", "2025-06-30", "day", "[]") // true
   *
   * // To set inclusivity without specifying unit, pass null for unit:
   * DayjsUtil.isBetween("2025-06-15", "2025-06-15", "2025-06-20", null, "[]") // true
   * DayjsUtil.isBetween("2025-06-15", "2025-06-15", "2025-06-20") // false (default "()" excludes boundaries)
   */
  static isBetween(
    date: DateInput,
    start: DateInput,
    end: DateInput,
    unit?: OpUnitType | null,
    inclusivity?: "()" | "[]" | "[)" | "(]",
    timezone?: TimezoneString,
  ): boolean {
    const tz = timezone ?? UTC;
    return dayjs(date)
      .tz(tz)
      .isBetween(dayjs(start).tz(tz), dayjs(end).tz(tz), unit, inclusivity);
  }

  // ─── Boundary Methods (Date return) ─────────────────────────────

  /**
   * Get the start of a time unit as a JS Date (UTC).
   * @param date - Input date
   * @param unit - Unit to compute start of
   * @param timezone - Timezone for the boundary (null = UTC)
   * @returns JavaScript Date at the start of the unit
   */
  static startOfDate(
    date: DateInput,
    unit: OpUnitType,
    timezone?: TimezoneString,
  ): Date {
    return this.startOf(date, unit, timezone).toDate();
  }

  /**
   * Get the end of a time unit as a JS Date (UTC).
   * @param date - Input date
   * @param unit - Unit to compute end of
   * @param timezone - Timezone for the boundary (null = UTC)
   * @returns JavaScript Date at the end of the unit
   */
  static endOfDate(
    date: DateInput,
    unit: OpUnitType,
    timezone?: TimezoneString,
  ): Date {
    return this.endOf(date, unit, timezone).toDate();
  }

  // ─── Timestamps ─────────────────────────────────────────────────

  /**
   * Get Unix timestamp in seconds.
   * @param date - Input date (current time if omitted)
   * @returns Seconds since Unix epoch
   */
  static toUnixSeconds(date?: DateInput): number {
    return dayjs(date).unix();
  }

  /**
   * Get Unix timestamp in milliseconds.
   * @param date - Input date (current time if omitted)
   * @returns Milliseconds since Unix epoch
   */
  static toUnixMilliseconds(date?: DateInput): number {
    return dayjs(date).valueOf();
  }

  // ─── Time Manipulation ──────────────────────────────────────────

  /**
   * Copy the time (hour, minute, second) from one date onto another date's
   * calendar day, in the specified timezone.
   *
   * Use case: drag-and-drop event to a new day while keeping its time.
   *
   * @param sourceDate - Date to copy time FROM
   * @param targetDate - Date to copy time ONTO (keeps its date)
   * @param timezone - Timezone for the operation (null = UTC)
   * @returns Dayjs with targetDate's date and sourceDate's time
   *
   * @example
   * // Drag event from June 15 14:30 to June 20 (keep 14:30)
   * DayjsUtil.copyTime("2025-06-15T14:30:00Z", "2025-06-20T00:00:00Z")
   * // → 2025-06-20 14:30:00 UTC
   */
  static copyTime(
    sourceDate: DateInput,
    targetDate: DateInput,
    timezone?: TimezoneString,
  ): Dayjs {
    const tz = timezone ?? UTC;
    const source = dayjs(sourceDate).tz(tz);
    const target = dayjs(targetDate).tz(tz);
    return target
      .hour(source.hour())
      .minute(source.minute())
      .second(source.second())
      .millisecond(source.millisecond());
  }

  /**
   * Check if a date represents midnight (00:00:00.000) in the specified timezone.
   *
   * Use case: all-day event detection.
   *
   * @param date - Date to check
   * @param timezone - Timezone for the check (null = UTC)
   * @returns true if the time is exactly midnight
   *
   * @example
   * DayjsUtil.isMidnight("2025-06-15T00:00:00Z") // true
   * DayjsUtil.isMidnight("2025-06-14T15:00:00Z", "Asia/Seoul") // true (midnight KST)
   */
  static isMidnight(date: DateInput, timezone?: TimezoneString): boolean {
    const tz = timezone ?? UTC;
    const d = dayjs(date).tz(tz);
    return (
      d.hour() === 0 &&
      d.minute() === 0 &&
      d.second() === 0 &&
      d.millisecond() === 0
    );
  }

  // ─── Duration Formatting ────────────────────────────────────────

  /**
   * Format a duration in milliseconds as a human-readable string.
   *
   * Negative values are treated as their absolute value — the sign is dropped.
   * If you need to distinguish positive/negative durations, check the sign
   * before calling this method.
   *
   * @param milliseconds - Duration in milliseconds (negative = absolute value)
   * @param options - { short: true } for "2h 30min", false for "2 hours 30 minutes"
   * @returns Formatted duration string (always positive)
   *
   * @example
   * DayjsUtil.formatDurationString(9_000_000) // "2h 30min"
   * DayjsUtil.formatDurationString(9_000_000, { short: false }) // "2 hours 30 minutes"
   * DayjsUtil.formatDurationString(-3_600_000) // "1h" (sign dropped)
   * DayjsUtil.formatDurationString(0) // "0min"
   */
  static formatDurationString(
    milliseconds: number,
    options?: { short?: boolean },
  ): string {
    const dur = dayjs.duration(Math.abs(milliseconds));
    const totalHours = Math.floor(dur.asHours());
    const minutes = dur.minutes();
    const short = options?.short ?? true;

    if (totalHours === 0 && minutes === 0) {
      return short ? "0min" : "0 minutes";
    }

    const parts: string[] = [];

    if (totalHours > 0) {
      parts.push(
        short
          ? `${totalHours}h`
          : `${totalHours} hour${totalHours !== 1 ? "s" : ""}`,
      );
    }

    if (minutes > 0) {
      parts.push(
        short
          ? `${minutes}min`
          : `${minutes} minute${minutes !== 1 ? "s" : ""}`,
      );
    }

    return parts.join(" ");
  }

  // ─── Calendar Domain ────────────────────────────────────────────

  /**
   * Get the RRULE day-of-week abbreviation for a date.
   * @param date - Input date
   * @param timezone - Timezone for day calculation (null = UTC)
   * @returns Two-letter RRULE day code ("SU", "MO", "TU", "WE", "TH", "FR", "SA")
   *
   * @example
   * DayjsUtil.dayOfWeekString("2025-06-16T00:00:00Z") // "MO" (Monday)
   */
  static dayOfWeekString(date: DateInput, timezone?: TimezoneString): RRuleDay {
    const tz = timezone ?? UTC;
    const d = dayjs(date).tz(tz);
    if (!d.isValid()) {
      throw new RangeError("Invalid date input for dayOfWeekString");
    }
    const day = RRULE_DAYS[d.day()];
    if (!day) {
      throw new RangeError("Invalid weekday index");
    }
    return day;
  }

  /**
   * Calculate remaining whole days between two dates (rounds up partial days).
   *
   * DST-safe: uses calendar-day arithmetic instead of fixed ms/day.
   * Use case: "Your trial expires in N days" — always rounds up so even
   * 0.1 remaining days shows as 1.
   *
   * @param fromDate - Start date
   * @param toDate - End date
   * @param timezone - Timezone for day calculation (null = UTC)
   * @returns Number of remaining days (ceiling away from zero), negative if toDate is in the past
   *
   * @example
   * DayjsUtil.remainingDays("2025-06-15", "2025-06-20") // 5
   * DayjsUtil.remainingDays("2025-06-15", "2025-06-15T01:00:00Z") // 1 (rounds up)
   */
  static remainingDays(
    fromDate: DateInput,
    toDate: DateInput,
    timezone?: TimezoneString,
  ): number {
    const tz = timezone ?? UTC;
    const from = dayjs(fromDate).tz(tz);
    const to = dayjs(toDate).tz(tz);
    // Use dayjs calendar-day diff (DST-aware, truncates toward zero)
    const wholeDays = to.diff(from, "day");
    // Check if there's a partial-day remainder
    const remainder = to.diff(from.add(wholeDays, "day"), "millisecond");
    if (remainder > 0) return wholeDays + 1;
    if (remainder < 0) return wholeDays - 1;
    return wholeDays;
  }
}

/** Re-export dayjs for advanced usage */
export { dayjs };
