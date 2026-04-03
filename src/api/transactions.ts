import apiClient from './client';
import type { Transaction, CreateTransactionPayload, UpdateTransactionPayload } from '../types/transaction';

export async function getTransactions(portfolioId: string, year: number): Promise<Transaction[]> {
  const response = await apiClient.get<Transaction[]>(`${portfolioId}/transactions/${year}`);
  return response.data ?? [];
}

export async function createTransaction(portfolioId: string, payload: CreateTransactionPayload): Promise<Transaction> {
  const response = await apiClient.post<Transaction>(`${portfolioId}/createTransaction`, payload);
  return response.data;
}

export async function updateTransaction(
  portfolioId: string,
  transactionId: number,
  payload: UpdateTransactionPayload,
): Promise<Transaction> {
  const response = await apiClient.put<Transaction>(
    `${portfolioId}/transactions/${transactionId}/update`,
    payload,
  );
  return response.data;
}

export async function deleteTransaction(portfolioId: string, transactionId: number): Promise<void> {
  await apiClient.delete(`${portfolioId}/transactions/${transactionId}/delete`);
}
