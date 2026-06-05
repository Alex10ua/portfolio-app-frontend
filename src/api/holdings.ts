import apiClient from './client';
import type { Holding } from '../types/holding';

export async function getHoldings(portfolioId: string): Promise<Holding[]> {
  const response = await apiClient.get<Holding[]>(`${portfolioId}`);
  return Array.isArray(response.data) ? response.data : [];
}

export async function getFirstTradeYear(portfolioId: string): Promise<number | null> {
  const response = await apiClient.get<{ firstTradeYear?: number }>(`${portfolioId}/firstTradeYear`);
  return response.data.firstTradeYear ?? null;
}

export async function getPortfolioHistory(portfolioId: string): Promise<{ date: string; portfolioValue: number }[]> {
  const response = await apiClient.get<{ date: string; portfolioValue: number }[]>(`${portfolioId}/portfolio-history`);
  return response.data;
}
