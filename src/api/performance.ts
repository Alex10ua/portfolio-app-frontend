import apiClient from './client';
import type { PerformanceData, PerformancePeriod, PnlSummary, RealizedPnLByCurrency } from '../types/performance';

export async function getPerformance(portfolioId: string, period: PerformancePeriod): Promise<PerformanceData> {
  const response = await apiClient.get<PerformanceData>(`${portfolioId}/performance`, {
    params: { period },
  });
  return response.data;
}

export async function getRealizedPnL(portfolioId: string): Promise<RealizedPnLByCurrency> {
  const response = await apiClient.get<RealizedPnLByCurrency>(`${portfolioId}/realizedPnL`);
  return response.data;
}

export async function getPnlSummary(portfolioId: string): Promise<PnlSummary> {
  const response = await apiClient.get<PnlSummary>(`${portfolioId}/pnl-summary`);
  return response.data;
}
