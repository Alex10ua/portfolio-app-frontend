import apiClient from './client';
import type { CheckpointPayload, ExtraPaymentPreview, Mortgage, MortgagePayload, MortgageScheduleRow, MortgageSummary, PaymentPayload, RatePeriodPayload } from '../types/mortgage';
import type { DecimalInput, FinancingStatus, PropertyView } from '../types/realEstate';

export const mortgagePath = (pid: string, propertyId: string, mortgageId?: string) => `${encodeURIComponent(pid)}/properties/${encodeURIComponent(propertyId)}/mortgages${mortgageId ? `/${encodeURIComponent(mortgageId)}` : ''}`;
const config = (key: string) => ({ headers: { 'Idempotency-Key': key } });
export interface MortgageDetail { mortgage: Mortgage; summary: MortgageSummary }
export interface MortgagePreview { summary: MortgageSummary; schedule: MortgageScheduleRow[] }
export async function getMortgage(pid: string, propertyId: string, id: string): Promise<MortgageDetail> {
  return (await apiClient.get<MortgageDetail>(mortgagePath(pid, propertyId, id))).data;
}
export async function createMortgage(pid: string, propertyId: string, body: MortgagePayload, key: string): Promise<PropertyView> {
  return (await apiClient.post<PropertyView>(mortgagePath(pid, propertyId), body, config(key))).data;
}
export async function updateMortgage(pid: string, propertyId: string, id: string, body: Partial<MortgagePayload>, key: string): Promise<PropertyView> {
  return (await apiClient.patch<PropertyView>(mortgagePath(pid, propertyId, id), body, config(key))).data;
}
export async function saveMortgageEvent(pid: string, propertyId: string, id: string, kind: 'payments' | 'balance-checkpoints' | 'rate-periods', eventId: string | null, body: PaymentPayload | CheckpointPayload | RatePeriodPayload, key: string): Promise<PropertyView> {
  const path = `${mortgagePath(pid, propertyId, id)}/${kind}${eventId ? `/${encodeURIComponent(eventId)}` : ''}`;
  return eventId
    ? (await apiClient.patch<PropertyView>(path, body, config(key))).data
    : (await apiClient.post<PropertyView>(path, body, config(key))).data;
}
export async function getMortgageSchedule(pid: string, propertyId: string, id: string, from: string, to: string): Promise<MortgageScheduleRow[]> {
  return (await apiClient.get<MortgageScheduleRow[]>(`${mortgagePath(pid, propertyId, id)}/schedule`, { params: { from, to } })).data;
}
export async function previewMortgage(pid: string, propertyId: string, id: string, body: { effectiveFrom: string; fixedUntil: string; annualNominalRatePercent: string | number; monthlyPayment?: string | number | null; extraPrincipalPaid?: string | number }): Promise<MortgagePreview> {
  return (await apiClient.post<MortgagePreview>(`${mortgagePath(pid, propertyId, id)}/preview`, body)).data;
}
/** Unsaved: what paying this extra principal on this date would do, keeping or lowering the installment. */
export async function previewExtraPayment(pid: string, propertyId: string, id: string, body: { date: string; amount: DecimalInput }): Promise<ExtraPaymentPreview> {
  return (await apiClient.post<ExtraPaymentPreview>(`${mortgagePath(pid, propertyId, id)}/extra-payment-preview`, body)).data;
}
/** Permanent. Removing an active loan needs financingAfter; the backend never infers it (MORTGAGE_RECORDED only while another loan stays open). */
export async function deleteMortgage(pid: string, propertyId: string, id: string, version: number, financingAfter?: FinancingStatus): Promise<PropertyView> {
  return (await apiClient.delete<PropertyView>(mortgagePath(pid, propertyId, id), { params: { version, financingAfter } })).data;
}
export async function closeMortgage(pid: string, propertyId: string, id: string, date: string, version: number, key: string): Promise<PropertyView> {
  return (await apiClient.post<PropertyView>(`${mortgagePath(pid, propertyId, id)}/close`, { date, version }, config(key))).data;
}
