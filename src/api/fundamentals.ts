import apiClient from './client';
import type { CompanyFundamentals } from '../types/fundamentals';

export async function getFundamentals(ticker: string): Promise<CompanyFundamentals | null> {
  try {
    const response = await apiClient.get<CompanyFundamentals>(`fundamentals/${ticker}`);
    return response.data;
  } catch (e) {
    const err = e as { response?: { status?: number } };
    if (err.response?.status === 404) return null;
    throw e;
  }
}

export async function refreshFundamentals(ticker: string): Promise<CompanyFundamentals | { status: string; ticker: string }> {
  const response = await apiClient.post(`fundamentals/${ticker}/refresh`);
  return response.data;
}
