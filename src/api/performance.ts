import apiClient from './client';
import type { PerformanceData, PerformancePeriod } from '../types/performance';

export async function getPerformance(portfolioId: string, period: PerformancePeriod): Promise<PerformanceData> {
  const response = await apiClient.get<PerformanceData>(`${portfolioId}/performance`, {
    params: { period },
  });
  return response.data;
}
