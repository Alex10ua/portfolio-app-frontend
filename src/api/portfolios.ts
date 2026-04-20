import apiClient from './client';
import type { Portfolio, CreatePortfolioPayload } from '../types/portfolio';

export async function getPortfolios(): Promise<Portfolio[]> {
  const response = await apiClient.get<Portfolio[]>('portfolios');
  return Array.isArray(response.data) ? response.data : [];
}

export async function createPortfolio(payload: CreatePortfolioPayload): Promise<Portfolio> {
  const response = await apiClient.post<Portfolio>('createPortfolio', payload);
  return response.data;
}
