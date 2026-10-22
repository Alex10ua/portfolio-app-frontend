export interface DividendCalendarEntry {
  ticker: string;
  /** per share, in `currency` (pence for a GBp line) */
  dividendAmount: number;
  stockQuantity: number;
  /** projected from the past payment pattern, not yet declared (absent on older APIs) */
  scheduled?: boolean;
  /** ex-dividend date, 'YYYY-MM-DD'; projected for a scheduled entry */
  exDate?: string | null;
  /** when the cash lands; null when the provider reports no pay date for the ticker */
  payDate?: string | null;
  /** payDate is ex-date + the ticker's usual lag, not reported for this payment */
  payDateEstimated?: boolean;
  name?: string | null;
  /** listing country as Yahoo names it ("United States") */
  country?: string | null;
  /** currency of dividendAmount — MarketData.currency */
  currency?: string | null;
  /** months (1–12) the ticker pays in, filled up to paymentsPerYear when a payment is missing */
  paymentMonths?: number[] | null;
  /** usual payments per year: most common yearly count of the last 5 finished years */
  paymentsPerYear?: number | null;
}

export type DividendCalendarData = Record<string, DividendCalendarEntry[]>;

export type DividendReceiptStatus = 'RECEIVED' | 'MISSING';

/** A user's override for one payment, keyed by ticker + ex-date. */
export interface DividendReceipt {
  id?: string;
  ticker: string;
  exDate: string;
  status: DividendReceiptStatus | null;
  /** percent withheld at source; null = the country default */
  withholdingRate: number | null;
}
