import { DayjsUtil } from "./DayjsUtil";
import { UTC } from "./constants";

/**
 * Specialized handler for calendar event date processing.
 *
 * Handles the critical distinction between:
 * - All-day events: time components preserved, timezone stripped to UTC
 * - Timed events: proper timezone conversion to UTC
 */
export class EventDateHandler {
  /**
   * Process dates for all-day events (preserves time components as UTC).
   * @param startDate - Start date string
   * @param endDate - End date string
   * @returns Object with startAt, endAt as UTC dates and zone as 'UTC'
   */
  static processAllDayEventDates(
    startDate: string,
    endDate: string,
  ): {
    startAt: Date;
    endAt: Date;
    zone: typeof UTC;
  } {
    return {
      startAt: DayjsUtil.stripTimezoneToUTC(startDate),
      endAt: DayjsUtil.stripTimezoneToUTC(endDate),
      zone: UTC,
    };
  }

  /**
   * Process dates for timed events (converts to UTC).
   * @param startDate - Start date string
   * @param endDate - End date string
   * @param timezone - Event timezone
   * @returns Object with startAt, endAt as UTC dates and original zone
   */
  static processTimedEventDates(
    startDate: string,
    endDate: string,
    timezone: string,
  ): {
    startAt: Date;
    endAt: Date;
    zone: string;
  } {
    return {
      startAt: DayjsUtil.convertToUTCDate(startDate),
      endAt: DayjsUtil.convertToUTCDate(endDate),
      zone: timezone,
    };
  }

  /**
   * Compute schedule dates based on event type.
   * Unified method that dispatches to processAllDayEventDates or
   * processTimedEventDates depending on the isAllDay flag.
   */
  // Overload: both dates provided → non-null return
  static computeScheduleDates(params: {
    startAt: string;
    endAt: string;
    timeZone: string;
    isAllDay?: boolean;
  }): [Date, Date, string];

  // Overload: dates may be undefined → nullable return
  static computeScheduleDates(params: {
    startAt?: string;
    endAt?: string;
    timeZone: string;
    isAllDay?: boolean;
  }): [Date | null, Date | null, string];

  // Implementation
  static computeScheduleDates(params: {
    startAt?: string;
    endAt?: string;
    timeZone: string;
    isAllDay?: boolean;
  }): [Date | null, Date | null, string] {
    const { startAt, endAt, timeZone, isAllDay } = params;

    if (!startAt || !endAt) {
      return [null, null, timeZone];
    }

    if (isAllDay) {
      const allDayDates = this.processAllDayEventDates(startAt, endAt);
      return [allDayDates.startAt, allDayDates.endAt, allDayDates.zone];
    } else {
      const timedDates = this.processTimedEventDates(startAt, endAt, timeZone);
      return [timedDates.startAt, timedDates.endAt, timedDates.zone];
    }
  }
}

export { UTC };
