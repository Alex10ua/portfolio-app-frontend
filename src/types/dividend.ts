// Every amount is in its own NATIVE currency — the client converts.
export interface DividendData {
  /** unconverted sum of projectionByCurrency — only exact for a mono-currency portfolio */
  yearlyCombineDividendsProjection: number;
  projectionByCurrency?: Record<string, number>;
  /** unconverted sum across currencies — only exact for a mono-currency portfolio */
  amountByMonth: Record<string, number>;
  /** currency → (month → amount in that currency) */
  amountByMonthByCurrency?: Record<string, Record<string, number>>;
  tickerAmount: Array<Record<string, number>>;
  tickerCurrency?: Record<string, string>; // ticker → its dividends' native currency
  fxRates?: Record<string, number>; // currency → rateVsEur for frontend conversion
  displayCurrency?: string; // hint: the single currency the payers share, else USD
}
