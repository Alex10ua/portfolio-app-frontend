import apiClient from './client';
import type { DividendData } from '../types/dividend';

export async function getDividends(portfolioId: string): Promise<DividendData> {
  const response = await apiClient.get<DividendData>(`${portfolioId}/dividends`);
  return response.data;
}
