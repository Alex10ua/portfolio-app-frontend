import apiClient from './client';
import type { PropertyHistoryPoint, PropertyPayload, PropertyView, ValuationPayload } from '../types/realEstate';

const base = (portfolioId: string) => `${encodeURIComponent(portfolioId)}/properties`;
const propertyPath = (portfolioId: string, propertyId: string) => `${base(portfolioId)}/${encodeURIComponent(propertyId)}`;
const headers = (key: string) => ({ headers: { 'Idempotency-Key': key } });

export async function getProperties(portfolioId: string): Promise<PropertyView[]> {
  return (await apiClient.get<PropertyView[]>(base(portfolioId))).data;
}
export async function getProperty(portfolioId: string, propertyId: string): Promise<PropertyView> {
  return (await apiClient.get<PropertyView>(propertyPath(portfolioId, propertyId))).data;
}
export async function getPropertyHistory(portfolioId: string, propertyId: string): Promise<PropertyHistoryPoint[]> {
  return (await apiClient.get<PropertyHistoryPoint[]>(`${propertyPath(portfolioId, propertyId)}/history`)).data;
}
export async function saveProperty(portfolioId: string, propertyId: string | null, payload: PropertyPayload, key: string): Promise<PropertyView> {
  const path = propertyId ? propertyPath(portfolioId, propertyId) : base(portfolioId);
  return propertyId
    ? (await apiClient.patch<PropertyView>(path, payload, headers(key))).data
    : (await apiClient.post<PropertyView>(path, payload, headers(key))).data;
}
export async function saveValuation(portfolioId: string, propertyId: string, valuationId: string | null, payload: ValuationPayload, key: string): Promise<PropertyView> {
  const path = `${propertyPath(portfolioId, propertyId)}/valuations${valuationId ? `/${encodeURIComponent(valuationId)}` : ''}`;
  return valuationId
    ? (await apiClient.patch<PropertyView>(path, payload, headers(key))).data
    : (await apiClient.post<PropertyView>(path, payload, headers(key))).data;
}
/** Permanent: the property, its valuations and its mortgages. Repeating it after success is a no-op. */
export async function deleteProperty(portfolioId: string, propertyId: string, version: number): Promise<void> {
  await apiClient.delete(propertyPath(portfolioId, propertyId), { params: { version } });
}
export async function archiveProperty(portfolioId: string, propertyId: string, date: string, version: number, key: string): Promise<PropertyView> {
  return (await apiClient.post<PropertyView>(`${propertyPath(portfolioId, propertyId)}/archive`, { date, version }, headers(key))).data;
}
