import apiClient from './client';
import type { Holding } from '../types/holding';
import type { PerformancePoint } from '../types/performance';

export async function getHoldings(portfolioId: string): Promise<Holding[]> {
  const response = await apiClient.get<Holding[]>(`${portfolioId}`);
  return Array.isArray(response.data) ? response.data : [];
}

export async function getFirstTradeYear(portfolioId: string): Promise<number | null> {
  const response = await apiClient.get<{ firstTradeYear?: number }>(`${portfolioId}/firstTradeYear`);
  return response.data.firstTradeYear ?? null;
}

export async function getPortfolioHistory(portfolioId: string): Promise<PerformancePoint[]> {
  const response = await apiClient.get<PerformancePoint[]>(`${portfolioId}/portfolio-history`);
  return response.data;
}
