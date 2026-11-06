import { useMutation, useQueries, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { closeMortgage, createMortgage, deleteMortgage, getMortgage, getMortgageSchedule, previewExtraPayment, previewMortgage, saveMortgageEvent, updateMortgage } from '../api/mortgages';
import type { MortgageEventKind } from '../api/mortgages';
import type { CheckpointPayload, MortgagePayload, MortgageScheduleRow, PaymentPayload, RatePeriodPayload, SavingsPayload } from '../types/mortgage';
import type { FinancingStatus } from '../types/realEstate';
import { useInvalidateRealEstate, useRealEstateRetryKey } from './useRealEstate';

export function useCreateMortgage(pid: string, propertyId: string) {
  const invalidate = useInvalidateRealEstate(pid); const keys = useRealEstateRetryKey();
  return useMutation({ mutationFn: async (body: MortgagePayload) => {
    const result = await createMortgage(pid, propertyId, body, keys.forPayload(body)); keys.succeeded(body); return result;
  }, onSuccess: invalidate });
}
export function useMortgage(pid: string, propertyId: string, id: string) {
  return useQuery({ queryKey: ['mortgage', pid, propertyId, id], queryFn: () => getMortgage(pid, propertyId, id), enabled: Boolean(pid && propertyId && id) });
}
export function useUpdateMortgage(pid: string, propertyId: string, id: string) {
  const invalidate = useInvalidateRealEstate(pid); const keys = useRealEstateRetryKey();
  return useMutation({ mutationFn: async (body: Partial<MortgagePayload>) => {
    const result = await updateMortgage(pid, propertyId, id, body, keys.forPayload(body)); keys.succeeded(body); return result;
  }, onSuccess: invalidate });
}
export function useSaveMortgageEvent(pid: string, propertyId: string, mortgageId: string) {
  const invalidate = useInvalidateRealEstate(pid); const keys = useRealEstateRetryKey();
  return useMutation({ mutationFn: async (input: { kind: MortgageEventKind; id: string | null; payload: PaymentPayload | CheckpointPayload | RatePeriodPayload | SavingsPayload }) => {
    const result = await saveMortgageEvent(pid, propertyId, mortgageId, input.kind, input.id, input.payload, keys.forPayload(input)); keys.succeeded(input); return result;
  }, onSuccess: invalidate });
}
export function useMortgageSchedule(pid: string, propertyId: string, id: string, from: string, to: string) {
  return useQuery({ queryKey: ['mortgage-schedule', pid, propertyId, id, from, to], queryFn: () => getMortgageSchedule(pid, propertyId, id, from, to), enabled: Boolean(pid && propertyId && id) });
}
/** Every listed loan's schedule over one range, sharing useMortgageSchedule's cache entries. */
export function useMortgageSchedules(pid: string, propertyId: string, ids: string[], from: string, to: string) {
  return useQueries({
    queries: ids.map(id => ({ queryKey: ['mortgage-schedule', pid, propertyId, id, from, to], queryFn: () => getMortgageSchedule(pid, propertyId, id, from, to), enabled: Boolean(pid && propertyId && id) })),
    combine: combineSchedules,
  });
}
function combineSchedules(results: UseQueryResult<MortgageScheduleRow[]>[]) {
  return {
    data: results.length && results.every(r => r.data) ? results.map(r => r.data as MortgageScheduleRow[]) : undefined,
    isFetching: results.some(r => r.isFetching),
    error: results.find(r => r.error)?.error ?? null,
    refetch: () => Promise.all(results.map(r => r.refetch())),
  };
}
export function useMortgagePreview(pid: string, propertyId: string, id: string) {
  return useMutation({ mutationFn: (body: Parameters<typeof previewMortgage>[3]) => previewMortgage(pid, propertyId, id, body) });
}
/** Keyed by the loan version too, so a saved payment or rate never shows a stale comparison. A 4xx is an answer, not a blip: no retry. */
export function useExtraPaymentPreview(pid: string, propertyId: string, id: string, version: number, date: string, amount: string) {
  return useQuery({
    queryKey: ['mortgage-extra-preview', pid, propertyId, id, version, date, amount],
    queryFn: () => previewExtraPayment(pid, propertyId, id, { date, amount }),
    enabled: Boolean(pid && propertyId && id && date && Number(amount) > 0),
    retry: false, staleTime: 60_000,
  });
}
/** The deleted loan's own queries are dropped rather than invalidated: a refetch would read a 404. */
export function useDeleteMortgage(pid: string, propertyId: string, id: string) {
  const qc = useQueryClient(); const invalidate = useInvalidateRealEstate(pid);
  return useMutation({
    mutationFn: (body: { version: number; financingAfter?: FinancingStatus }) =>
      deleteMortgage(pid, propertyId, id, body.version, body.financingAfter),
    onSuccess: view => {
      for (const key of ['mortgage', 'mortgage-schedule']) qc.removeQueries({ queryKey: [key, pid, propertyId, id] });
      qc.setQueryData(['property', pid, propertyId], view);
      return invalidate();
    },
  });
}
export function useCloseMortgage(pid: string, propertyId: string, id: string) {
  const invalidate = useInvalidateRealEstate(pid); const keys = useRealEstateRetryKey();
  return useMutation({ mutationFn: async (body: { date: string; version: number }) => {
    const result = await closeMortgage(pid, propertyId, id, body.date, body.version, keys.forPayload(body)); keys.succeeded(body); return result;
  }, onSuccess: invalidate });
}
