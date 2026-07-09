import apiClient from './client';
import type { CashHolding } from '../types/cash';

export async function getCashHoldings(portfolioId: string): Promise<CashHolding[]> {
  const res = await apiClient.get<CashHolding[]>(`${portfolioId}/cash`);
  return res.data;
}

export async function upsertCashHolding(
  portfolioId: string,
  currency: string,
  amount: number,
): Promise<CashHolding> {
  const res = await apiClient.put<CashHolding>(`${portfolioId}/cash`, { currency, amount });
  return res.data;
}

export async function deleteCashHolding(portfolioId: string, currency: string): Promise<void> {
  await apiClient.delete(`${portfolioId}/cash/${currency}`);
}
