import apiClient from './client';
import type { TickerNote } from '../types/note';

export async function getTickerNote(portfolioId: string, ticker: string): Promise<TickerNote> {
  const res = await apiClient.get<TickerNote>(`notes/${ticker}`, { params: { portfolioId } });
  return res.data;
}

export async function setTickerNote(portfolioId: string, ticker: string, note: string): Promise<TickerNote> {
  const res = await apiClient.put<TickerNote>(`notes/${ticker}`, { note }, { params: { portfolioId } });
  return res.data;
}
