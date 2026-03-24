export const UTC = "UTC" as const;

export const DATE_FORMAT = {
  /** Date only: 2025-01-01 */
  DATE: "YYYY-MM-DD",
  /** Datetime without timezone: 2025-01-01T10:00:00 */
  DATETIME: "YYYY-MM-DDTHH:mm:ss",
  /** UTC datetime with Z: 2025-01-01T10:00:00Z */
  DATETIME_UTC: "YYYY-MM-DDTHH:mm:ssZ",
  /** Datetime with timezone offset: 2025-01-01T10:00:00+09:00 */
  DATETIME_OFFSET: "YYYY-MM-DDTHH:mm:ss±HH:mm",
  /** Datetime with milliseconds: 2025-01-01T10:00:00.000 */
  DATETIME_MS: "YYYY-MM-DDTHH:mm:ss.SSS",
  /** .toISOString() output: 2025-01-01T10:00:00.000Z */
  DATETIME_MS_UTC: "YYYY-MM-DDTHH:mm:ss.SSSZ",
  /** Full precision with offset: 2025-01-01T10:00:00.000+09:00 */
  DATETIME_MS_OFFSET: "YYYY-MM-DDTHH:mm:ss.SSS±HH:mm",
} as const;

export type DateFormat = (typeof DATE_FORMAT)[keyof typeof DATE_FORMAT];

export const FORMAT_PATTERNS: Record<DateFormat, RegExp> = {
  "YYYY-MM-DD": /^\d{4}-\d{2}-\d{2}$/,
  "YYYY-MM-DDTHH:mm:ss": /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
  "YYYY-MM-DDTHH:mm:ssZ": /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
  "YYYY-MM-DDTHH:mm:ss±HH:mm":
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
  "YYYY-MM-DDTHH:mm:ss.SSS": /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/,
  "YYYY-MM-DDTHH:mm:ss.SSSZ": /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  "YYYY-MM-DDTHH:mm:ss.SSS±HH:mm":
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/,
};
