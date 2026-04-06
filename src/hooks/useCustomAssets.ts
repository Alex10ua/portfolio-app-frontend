import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCustomAssets,
  createCustomAsset,
  updateCustomAsset,
  deleteCustomAsset,
  updateCustomAssetPrice,
} from '../api/customAssets';
import type { CreateCustomAssetPayload } from '../types/customAsset';

export function useCustomAssets(portfolioId: string) {
  return useQuery({
    queryKey: ['customAssets', portfolioId],
    queryFn: () => getCustomAssets(portfolioId),
    enabled: Boolean(portfolioId),
  });
}

export function useCreateCustomAsset(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustomAssetPayload) => createCustomAsset(portfolioId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customAssets', portfolioId] });
    },
  });
}

export function useUpdateCustomAsset(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticker, payload }: { ticker: string; payload: Partial<CreateCustomAssetPayload> }) =>
      updateCustomAsset(portfolioId, ticker, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customAssets', portfolioId] });
    },
  });
}

export function useDeleteCustomAsset(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticker: string) => deleteCustomAsset(portfolioId, ticker),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customAssets', portfolioId] });
    },
  });
}

export function useUpdateCustomAssetPrice(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticker, price }: { ticker: string; price: number }) =>
      updateCustomAssetPrice(portfolioId, ticker, price),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customAssets', portfolioId] });
      void qc.invalidateQueries({ queryKey: ['holdings', portfolioId] });
    },
  });
}
