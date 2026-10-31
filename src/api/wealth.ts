import apiClient from './client';
import type { WealthHistoryPoint, WealthSummary } from '../types/wealth';

export async function getWealth(portfolioId: string): Promise<WealthSummary> {
  return (await apiClient.get<WealthSummary>(`${encodeURIComponent(portfolioId)}/wealth`)).data;
}

export async function getWealthHistory(portfolioId: string): Promise<WealthHistoryPoint[]> {
  return (await apiClient.get<WealthHistoryPoint[]>(`${encodeURIComponent(portfolioId)}/wealth/history`)).data;
}
