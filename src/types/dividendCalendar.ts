export interface DividendCalendarEntry {
  ticker: string;
  dividendAmount: number;
  stockQuantity: number;
}

export type DividendCalendarData = Record<string, DividendCalendarEntry[]>;
