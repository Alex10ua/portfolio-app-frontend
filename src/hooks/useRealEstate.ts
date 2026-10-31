import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { archiveProperty, deleteProperty, getProperties, getProperty, getPropertyHistory, saveProperty, saveValuation } from '../api/realEstate';
import { useSettings } from '../context/SettingsContext';
import { readLocalPortfolioSettings } from '../lib/portfolioSettingsStore';
import type { PropertyPayload, ValuationPayload } from '../types/realEstate';

/** Per-portfolio switch (Portfolio Settings) that keeps property out of a securities portfolio. */
export function useRealEstateHidden(portfolioId: string | undefined) {
  const { getPortfolioSettings } = useSettings();
  if (!portfolioId) return false;
  return getPortfolioSettings(portfolioId)?.hideRealEstate
    ?? readLocalPortfolioSettings(portfolioId).hideRealEstate ?? false;
}

export function useProperties(portfolioId: string) {
  return useQuery({ queryKey: ['properties', portfolioId], queryFn: () => getProperties(portfolioId), enabled: Boolean(portfolioId) });
}
export function useProperty(portfolioId: string, propertyId: string) {
  return useQuery({ queryKey: ['property', portfolioId, propertyId], queryFn: () => getProperty(portfolioId, propertyId), enabled: Boolean(portfolioId && propertyId) });
}
export function usePropertyHistory(portfolioId: string, propertyId: string) {
  return useQuery({ queryKey: ['property-history', portfolioId, propertyId], queryFn: () => getPropertyHistory(portfolioId, propertyId), enabled: Boolean(portfolioId && propertyId) });
}
export function useInvalidateRealEstate(portfolioId: string) {
  const qc = useQueryClient();
  return () => Promise.all(['properties', 'property', 'property-history', 'mortgage', 'mortgage-schedule', 'wealth', 'wealth-history'].map(key => qc.invalidateQueries({ queryKey: [key, portfolioId] })));
}

/** A retry of the same uncertain write keeps its key while the form remains open. */
export function useRealEstateRetryKey() {
  const pending = useRef(new Map<string, string>());
  return {
    forPayload: (payload: unknown) => {
      const fingerprint = JSON.stringify(payload);
      let key = pending.current.get(fingerprint);
      if (!key) { key = Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join(''); pending.current.set(fingerprint, key); }
      return key;
    },
    succeeded: (payload: unknown) => pending.current.delete(JSON.stringify(payload)),
  };
}
export function useSaveProperty(portfolioId: string) {
  const invalidate = useInvalidateRealEstate(portfolioId);
  const keys = useRealEstateRetryKey();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string | null; payload: PropertyPayload }) => {
      const input = { id, payload }; const result = await saveProperty(portfolioId, id, payload, keys.forPayload(input)); keys.succeeded(input); return result;
    }, onSuccess: invalidate,
  });
}
export function useSaveValuation(portfolioId: string, propertyId: string) {
  const invalidate = useInvalidateRealEstate(portfolioId); const keys = useRealEstateRetryKey();
  return useMutation({ mutationFn: async ({ id, payload }: { id: string | null; payload: ValuationPayload }) => {
    const input = { id, payload }; const result = await saveValuation(portfolioId, propertyId, id, payload, keys.forPayload(input)); keys.succeeded(input); return result;
  }, onSuccess: invalidate });
}
/** The deleted property's own queries are dropped rather than invalidated: a refetch would read a 404. */
export function useDeleteProperty(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; version: number }) => deleteProperty(portfolioId, input.id, input.version),
    onSuccess: (_, input) => {
      for (const key of ['property', 'property-history', 'mortgage', 'mortgage-schedule']) qc.removeQueries({ queryKey: [key, portfolioId, input.id] });
      return Promise.all(['properties', 'wealth', 'wealth-history'].map(key => qc.invalidateQueries({ queryKey: [key, portfolioId] })));
    },
  });
}
export function useArchiveProperty(portfolioId: string) {
  const invalidate = useInvalidateRealEstate(portfolioId); const keys = useRealEstateRetryKey();
  return useMutation({ mutationFn: async (input: { id: string; date: string; version: number }) => {
    const result = await archiveProperty(portfolioId, input.id, input.date, input.version, keys.forPayload(input)); keys.succeeded(input); return result;
  }, onSuccess: invalidate });
}
