export interface DividendCalendarEntry {
  ticker: string;
  dividendAmount: number;
  stockQuantity: number;
  /** projected from the past payment pattern, not yet declared (absent on older APIs) */
  scheduled?: boolean;
}

export type DividendCalendarData = Record<string, DividendCalendarEntry[]>;
