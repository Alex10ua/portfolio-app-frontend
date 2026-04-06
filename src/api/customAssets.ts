import apiClient from './client';
import type { CustomAsset, CreateCustomAssetPayload } from '../types/customAsset';

export async function getCustomAssets(portfolioId: string): Promise<CustomAsset[]> {
  const response = await apiClient.get<CustomAsset[]>(`${portfolioId}/custom-assets`);
  return Array.isArray(response.data) ? response.data : [];
}

export async function getCustomAsset(portfolioId: string, ticker: string): Promise<CustomAsset> {
  const response = await apiClient.get<CustomAsset>(`${portfolioId}/custom-assets/${ticker}`);
  return response.data;
}

export async function createCustomAsset(portfolioId: string, payload: CreateCustomAssetPayload): Promise<CustomAsset> {
  const response = await apiClient.post<CustomAsset>(`${portfolioId}/custom-assets`, payload);
  return response.data;
}

export async function updateCustomAsset(portfolioId: string, ticker: string, payload: Partial<CreateCustomAssetPayload>): Promise<CustomAsset> {
  const response = await apiClient.put<CustomAsset>(`${portfolioId}/custom-assets/${ticker}`, payload);
  return response.data;
}

export async function deleteCustomAsset(portfolioId: string, ticker: string): Promise<void> {
  await apiClient.delete(`${portfolioId}/custom-assets/${ticker}`);
}

export async function updateCustomAssetPrice(portfolioId: string, ticker: string, price: number): Promise<CustomAsset> {
  const response = await apiClient.put<CustomAsset>(`${portfolioId}/custom-assets/${ticker}/price`, { price });
  return response.data;
}
