export interface DividendData {
  yearlyCombineDividendsProjection: number;
  amountByMonth: Record<string, number>;
  tickerAmount: Array<Record<string, number>>;
  fxRates?: Record<string, number>; // currency → rateVsEur for frontend conversion
}
