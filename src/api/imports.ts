import apiClient from './client';
import type { ImportRecord, ImportDetail, ImportBatchPayload } from '../types/imports';

export async function getImports(portfolioId: string): Promise<ImportRecord[]> {
  const response = await apiClient.get<ImportRecord[]>(`${portfolioId}/imports`);
  return response.data ?? [];
}

export async function getImportDetail(portfolioId: string, importId: string): Promise<ImportDetail> {
  const response = await apiClient.get<ImportDetail>(`${portfolioId}/imports/${importId}`);
  return response.data;
}

export async function submitImportBatch(portfolioId: string, payload: ImportBatchPayload): Promise<ImportRecord> {
  const response = await apiClient.post<ImportRecord>(`${portfolioId}/imports`, payload);
  return response.data;
}

export async function deleteImport(portfolioId: string, importId: string): Promise<void> {
  await apiClient.delete(`${portfolioId}/imports/${importId}`);
}
