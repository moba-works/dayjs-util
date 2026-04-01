import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
import { UTC } from "./constants";
import type { DateInput, NormalizedEventDates } from "./types";

dayjs.extend(utc);
dayjs.extend(tz);

type StringFormat =
  | "compact-ical"
  | "date-only"
  | "datetime-offset"
  | "datetime-bare"
  | "unknown";

/**
 * Calendar event date normalizer.
 *
 * Normalizes dates from any calendar API format (Google Calendar, Microsoft
 * Graph, iCal/RFC 5545, Calendly) to UTC Date objects for consistent storage.
 *
 * Handles the critical distinction between:
 * - **All-day events**: a calendar date, not a moment — normalized to midnight UTC
 * - **Timed events**: a specific point in time — converted to UTC
 */
export class EventDateHandler {
  // ─── Private Helpers ──────────────────────────────────────────────

  /**
   * Detect the format category of a string input.
   */
  private static detectStringFormat(input: string): StringFormat {
    if (/^\d{8}$/.test(input)) return "compact-ical";
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return "date-only";
    if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(input)) return "datetime-offset";
    if (/T/.test(input)) return "datetime-bare";
    return "unknown";
  }

  /**
   * Extract the calendar date from any input and return midnight UTC.
   *
   * For string inputs, the date is extracted from the string literal
   * (not parsed through dayjs) to avoid timezone-induced date shifts.
   * E.g., "2025-06-15T00:00:00+09:00" yields June 15, not June 14.
   */
  private static toMidnightUTC(input: DateInput): Date {
    if (input instanceof Date) {
      return new Date(
        Date.UTC(
          input.getUTCFullYear(),
          input.getUTCMonth(),
          input.getUTCDate(),
        ),
      );
    }

    if (dayjs.isDayjs(input)) {
      const d = input as Dayjs;
      return new Date(Date.UTC(d.year(), d.month(), d.date()));
    }

    if (typeof input === "number") {
      const d = new Date(input);
      return new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      );
    }

    // String handling — extract date from the literal string
    const format = this.detectStringFormat(input);

    switch (format) {
      case "compact-ical": {
        const year = parseInt(input.slice(0, 4), 10);
        const month = parseInt(input.slice(4, 6), 10) - 1;
        const day = parseInt(input.slice(6, 8), 10);
        return new Date(Date.UTC(year, month, day));
      }
      case "date-only": {
        const [y, m, d] = input.split("-").map(Number);
        return new Date(Date.UTC(y!, m! - 1, d!));
      }
      case "datetime-offset":
      case "datetime-bare": {
        const dateMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          return new Date(
            Date.UTC(
              parseInt(dateMatch[1]!, 10),
              parseInt(dateMatch[2]!, 10) - 1,
              parseInt(dateMatch[3]!, 10),
            ),
          );
        }
        // Fallback: let dayjs parse, extract date
        const parsed = dayjs(input);
        return new Date(Date.UTC(parsed.year(), parsed.month(), parsed.date()));
      }
      default: {
        const parsed = dayjs(input);
        return new Date(Date.UTC(parsed.year(), parsed.month(), parsed.date()));
      }
    }
  }

  /**
   * Parse an input to a UTC Date, using timezone for interpretation
   * when the string has no embedded offset.
   *
   * - String WITH offset: offset is used, timezone param is metadata only
   * - String WITHOUT offset: timezone param is used for parsing
   * - Non-string inputs: already a point in time
   */
  private static parseToUTCDate(input: DateInput, timezone: string): Date {
    if (input instanceof Date) return dayjs.utc(input).toDate();
    if (dayjs.isDayjs(input)) return dayjs.utc(input.valueOf()).toDate();
    if (typeof input === "number") return dayjs.utc(input).toDate();

    const format = this.detectStringFormat(input);

    switch (format) {
      case "datetime-offset":
        return dayjs.utc(input).toDate();

      case "datetime-bare":
        return dayjs.tz(input, timezone).utc().toDate();

      case "date-only":
        return dayjs.tz(input, timezone).utc().toDate();

      case "compact-ical": {
        const normalized = `${input.slice(0, 4)}-${input.slice(4, 6)}-${input.slice(6, 8)}`;
        return dayjs.tz(normalized, timezone).utc().toDate();
      }

      default:
        return dayjs.utc(input).toDate();
    }
  }

  // ─── Public Methods ───────────────────────────────────────────────

  /**
   * Normalize an all-day event date pair to UTC midnight.
   *
   * All-day events represent a calendar date, not a point in time.
   * This method extracts the date portion from any input format and
   * returns midnight UTC on that date. Time components are always zeroed.
   *
   * Supported input formats:
   * - Plain date: "2025-06-15" (Google Calendar, Cal.com)
   * - Compact iCal: "20250615" (RFC 5545 VALUE=DATE)
   * - Datetime with offset: "2025-06-15T00:00:00+09:00" (offset ignored)
   * - Datetime UTC: "2025-06-15T00:00:00Z"
   * - Datetime without offset: "2025-06-15T00:00:00" (Microsoft Graph)
   * - Date object or Dayjs instance
   *
   * @param start - Start date in any supported format
   * @param end - End date in any supported format
   * @returns Normalized dates with timezone set to "UTC"
   *
   * @example
   * EventDateHandler.toAllDayUTC("2025-06-15", "2025-06-16");
   * EventDateHandler.toAllDayUTC("2025-06-15T00:00:00+09:00", "2025-06-16T00:00:00+09:00");
   * // Both → { start: Date(2025-06-15T00:00:00Z), end: Date(2025-06-16T00:00:00Z), timezone: "UTC" }
   */
  static toAllDayUTC(start: DateInput, end: DateInput): NormalizedEventDates {
    return {
      start: this.toMidnightUTC(start),
      end: this.toMidnightUTC(end),
      timezone: UTC,
    };
  }

  /**
   * Normalize a timed event date pair to UTC.
   *
   * Timed events represent a specific point in time. This method converts
   * the input to UTC, using the timezone parameter for parsing when the
   * input string has no embedded offset.
   *
   * How timezone is resolved:
   * - String WITH offset ("...+09:00", "...Z"): offset used for conversion,
   *   timezone stored as metadata
   * - String WITHOUT offset ("2025-06-15T09:00:00"): timezone used to
   *   interpret the string (e.g., "this time is in Asia/Seoul")
   * - Date/Dayjs/number: already a point in time, timezone is metadata
   *
   * @param start - Start datetime in any supported format
   * @param end - End datetime in any supported format
   * @param timezone - IANA timezone (e.g., "Asia/Seoul"). Required for
   *   correct parsing when input has no offset.
   * @returns Normalized dates with the original timezone preserved
   *
   * @example
   * // Offset embedded (Google Calendar) — offset does the work
   * EventDateHandler.toTimedUTC("2025-06-15T09:00:00+09:00", "2025-06-15T10:00:00+09:00", "Asia/Seoul");
   *
   * // No offset (Microsoft Graph) — timezone used for parsing
   * EventDateHandler.toTimedUTC("2025-06-15T09:00:00", "2025-06-15T10:00:00", "Asia/Seoul");
   *
   * // Both → { start: Date(2025-06-15T00:00:00Z), end: Date(2025-06-15T01:00:00Z), timezone: "Asia/Seoul" }
   */
  static toTimedUTC(
    start: DateInput,
    end: DateInput,
    timezone: string,
  ): NormalizedEventDates {
    return {
      start: this.parseToUTCDate(start, timezone),
      end: this.parseToUTCDate(end, timezone),
      timezone,
    };
  }

  /**
   * Normalize an event date pair based on event type.
   *
   * Dispatches to toAllDayUTC or toTimedUTC based on the isAllDay flag.
   * Returns null when start or end is missing.
   */
  static normalize(params: {
    start: DateInput;
    end: DateInput;
    timezone: string;
    isAllDay?: boolean;
  }): NormalizedEventDates;

  static normalize(params: {
    start?: DateInput;
    end?: DateInput;
    timezone: string;
    isAllDay?: boolean;
  }): NormalizedEventDates | null;

  static normalize(params: {
    start?: DateInput;
    end?: DateInput;
    timezone: string;
    isAllDay?: boolean;
  }): NormalizedEventDates | null {
    const { start, end, timezone, isAllDay } = params;

    if (start == null || end == null) {
      return null;
    }

    if (isAllDay) {
      return this.toAllDayUTC(start, end);
    }

    return this.toTimedUTC(start, end, timezone);
  }
}

export { UTC };
