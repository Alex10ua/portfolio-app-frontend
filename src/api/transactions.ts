import apiClient, { PROVIDER_TIMEOUT_MS } from './client';
import type { Transaction, CreateTransactionPayload, UpdateTransactionPayload } from '../types/transaction';

export async function getTransactions(portfolioId: string, year: number): Promise<Transaction[]> {
  const response = await apiClient.get<Transaction[]>(`${portfolioId}/transactions/${year}`);
  return response.data ?? [];
}

export async function createTransaction(
  portfolioId: string, payload: CreateTransactionPayload, idempotencyKey: string,
): Promise<{ save: Transaction; holdingSynced: boolean }> {
  // a first trade in a ticker fetches its market data synchronously before answering
  const response = await apiClient.post<{ save: Transaction; holdingSynced: boolean }>(`${portfolioId}/createTransaction`, payload,
    { timeout: PROVIDER_TIMEOUT_MS, headers: { 'Idempotency-Key': idempotencyKey } });
  return response.data;
}

export async function updateTransaction(
  portfolioId: string,
  transactionId: string,
  payload: UpdateTransactionPayload,
): Promise<Transaction> {
  const response = await apiClient.put<Transaction>(
    `${portfolioId}/transactions/${transactionId}/update`,
    payload,
  );
  return response.data;
}

export async function deleteTransaction(portfolioId: string, transactionId: string): Promise<void> {
  await apiClient.delete(`${portfolioId}/transactions/${transactionId}/delete`);
}

/** Returns cash balance per currency derived from DEPOSIT/WITHDRAWAL transactions. */
export async function getCashBalance(portfolioId: string): Promise<Record<string, number>> {
  const response = await apiClient.get<Record<string, number>>(`${portfolioId}/cashBalance`);
  return response.data ?? {};
}
