import type { Dayjs, ManipulateType } from "dayjs";

/** Accepted date input types across all DateUtil methods */
export type DateInput = Date | string | number | Dayjs;

/**
 * Timezone string or null.
 * - Pass a valid IANA timezone (e.g., 'Asia/Seoul', 'America/New_York')
 * - Pass null or omit to default to UTC
 */
export type TimezoneString = string | null;

/** Re-export ManipulateType for add/subtract operations */
export type { ManipulateType };
