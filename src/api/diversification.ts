import apiClient from './client';
import type { DiversificationData } from '../types/diversification';

export async function getDiversification(portfolioId: string): Promise<DiversificationData> {
  const response = await apiClient.get<DiversificationData>(`${portfolioId}/diversification`);
  return response.data;
}
