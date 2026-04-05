import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getImports, getImportDetail, submitImportBatch, deleteImport } from '../api/imports';
import type { ImportBatchPayload } from '../types/imports';

export function useImports(portfolioId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['imports', portfolioId],
    queryFn: () => getImports(portfolioId),
    enabled: Boolean(portfolioId) && enabled,
  });
}

export function useImportDetail(portfolioId: string, importId: string | null) {
  return useQuery({
    queryKey: ['importDetail', portfolioId, importId],
    queryFn: () => getImportDetail(portfolioId, importId!),
    enabled: Boolean(portfolioId) && importId !== null,
  });
}

export function useSubmitImportBatch(portfolioId: string, onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ImportBatchPayload) => submitImportBatch(portfolioId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['imports', portfolioId] });
      void qc.invalidateQueries({ queryKey: ['holdings', portfolioId] });
      onSuccess?.();
    },
  });
}

export function useDeleteImport(portfolioId: string, onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (importId: string) => deleteImport(portfolioId, importId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['imports', portfolioId] });
      void qc.invalidateQueries({ queryKey: ['holdings', portfolioId] });
      void qc.invalidateQueries({ queryKey: ['transactions', portfolioId] });
      onSuccess?.();
    },
  });
}
