export interface DividendData {
  yearlyCombineDividendsProjection: number;
  amountByMonth: Record<string, number>;
  tickerAmount: Array<Record<string, number>>;
  fxRates?: Record<string, number>; // currency → rateVsEur for frontend conversion
  displayCurrency?: string; // currency all amounts are expressed in (USD if multi-currency, else the single currency)
}
