export interface DividendData {
  yearlyCombineDividendsProjection: number;
  amountByMonth: Record<string, number>;
  tickerAmount: Array<Record<string, number>>;
}
