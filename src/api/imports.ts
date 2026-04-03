import apiClient from './client';
import type { ImportRecord, ImportDetail } from '../types/imports';

export async function getImports(portfolioId: string): Promise<ImportRecord[]> {
  const response = await apiClient.get<ImportRecord[]>(`${portfolioId}/imports`);
  return response.data ?? [];
}

export async function getImportDetail(portfolioId: string, importId: number): Promise<ImportDetail> {
  const response = await apiClient.get<ImportDetail>(`${portfolioId}/imports/${importId}`);
  return response.data;
}

export async function uploadImport(portfolioId: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  await apiClient.post(`${portfolioId}/imports`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function deleteImport(portfolioId: string, importId: number): Promise<void> {
  await apiClient.delete(`${portfolioId}/imports/${importId}`);
}
