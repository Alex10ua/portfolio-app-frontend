/**
 * Timezone-safe parsing of the date strings the API returns.
 *
 * `new Date("2024-01")` and `new Date("2024-01-15")` are parsed by ECMAScript as
 * **UTC** midnight, while `getFullYear()`/`getMonth()`/`getDate()` read back in
 * local time. West of UTC that lands on the previous day — so a `"2024-01"`
 * dividend month reads as December 2023 and gets bucketed into the wrong quarter
 * and the wrong year. East of UTC the same string is merely an hour into the
 * right day, which is why this stays invisible until someone runs the app in a
 * negative-offset timezone.
 *
 * Everything here treats a date-only string as a *calendar* date with no instant
 * attached, which is what `LocalDate` on the backend means.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;

/** True for `YYYY-MM` and `YYYY-MM-DD` — the two shapes the API sends. */
export function isDateOnly(value: string | null | undefined): boolean {
  return typeof value === 'string' && DATE_ONLY.test(value.trim());
}

/**
 * `YYYY-MM` / `YYYY-MM-DD` → a Date at **local** midnight, so calendar getters
 * return what the string says. Anything else (a full timestamp) is handed to the
 * platform parser unchanged.
 */
export function parseLocalDate(value: string): Date {
  const m = DATE_ONLY.exec(value.trim());
  if (!m) return new Date(value);
  return new Date(Number(m[1]), Number(m[2]) - 1, m[3] ? Number(m[3]) : 1);
}

/** Calendar year, read off the string rather than through a Date. */
export function yearOf(value: string): number {
  const m = DATE_ONLY.exec(value.trim());
  return m ? Number(m[1]) : new Date(value).getFullYear();
}

/** Zero-based month index (0 = January), read off the string. */
export function monthIndexOf(value: string): number {
  const m = DATE_ONLY.exec(value.trim());
  return m ? Number(m[2]) - 1 : new Date(value).getMonth();
}

/** 1-based quarter (1…4) of a `YYYY-MM` / `YYYY-MM-DD` string. */
export function quarterOf(value: string): number {
  return Math.floor(monthIndexOf(value) / 3) + 1;
}

/**
 * Value for an `<input type="date">`: the calendar day, never shifted. Accepts a
 * `LocalDate` string as-is and truncates a timestamp to its date part.
 */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return '';
  // local getters, so the day matches what the user sees rather than the UTC day
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Excel serial number → `YYYY-MM-DD`. Two epochs exist: the 1900 system (the
 * default, epoch 1899-12-30 to absorb the Lotus leap-year bug) and the 1904
 * system used by files produced on classic Mac Excel — NN Slovensko's statements
 * are 1904.
 */
export function excelSerialToISO(serial: number, date1904 = false): string {
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  // built and read in UTC on both sides, so no timezone can shift the day
  return new Date(epoch + serial * 86400000).toISOString().slice(0, 10);
}

/**
 * Whatever a spreadsheet cell holds → `YYYY-MM-DD`. A date cell read without
 * `cellDates` arrives as a serial *number*; with it, as a `Date`; a text cell as
 * a string. Sending the raw number to the backend fails its `LocalDate` parse.
 */
export function normalizeDateCell(raw: unknown, date1904 = false): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) return excelSerialToISO(raw, date1904);
  if (raw instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${raw.getFullYear()}-${pad(raw.getMonth() + 1)}-${pad(raw.getDate())}`;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    // a numeric string is still a serial (sheet_to_json can stringify it)
    if (/^\d+(\.\d+)?$/.test(trimmed)) return excelSerialToISO(Number(trimmed), date1904);
    return trimmed;
  }
  return '';
}
