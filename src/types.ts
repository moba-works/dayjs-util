import type { Dayjs, ManipulateType } from "dayjs";

/** Accepted date input types across all DateUtil methods */
export type DateInput = Date | string | number | Dayjs;

/**
 * Timezone string or null.
 * - Pass a valid IANA timezone (e.g., 'Asia/Seoul', 'America/New_York')
 * - Pass null or omit to default to UTC
 */
export type TimezoneString = string | null;

/**
 * Result of normalizing a calendar event date pair to UTC.
 * Returned by EventDateHandler methods.
 */
export interface NormalizedEventDates {
  /** Start date as UTC Date object */
  start: Date;
  /** End date as UTC Date object */
  end: Date;
  /**
   * Effective timezone:
   * - "UTC" for all-day events
   * - Original IANA timezone for timed events
   */
  timezone: string;
}

/** Re-export ManipulateType for add/subtract operations */
export type { ManipulateType };
