import apiClient from './client';
import type { DividendReceipt } from '../types/dividendCalendar';

export async function getDividendReceipts(portfolioId: string): Promise<DividendReceipt[]> {
  const res = await apiClient.get<DividendReceipt[]>(`${portfolioId}/dividend-receipts`);
  return res.data;
}

/** Replaces status and rate for ticker + exDate; both null removes the override. */
export async function saveDividendReceipt(portfolioId: string, receipt: DividendReceipt): Promise<void> {
  await apiClient.put(`${portfolioId}/dividend-receipts`, {
    ticker: receipt.ticker,
    exDate: receipt.exDate,
    status: receipt.status,
    withholdingRate: receipt.withholdingRate,
  });
}
