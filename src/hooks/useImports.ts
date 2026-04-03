import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getImports, getImportDetail, uploadImport, deleteImport } from '../api/imports';

export function useImports(portfolioId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['imports', portfolioId],
    queryFn: () => getImports(portfolioId),
    enabled: Boolean(portfolioId) && enabled,
  });
}

export function useImportDetail(portfolioId: string, importId: number | null) {
  return useQuery({
    queryKey: ['importDetail', portfolioId, importId],
    queryFn: () => getImportDetail(portfolioId, importId!),
    enabled: Boolean(portfolioId) && importId !== null,
  });
}

export function useUploadImport(portfolioId: string, onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadImport(portfolioId, file),
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
    mutationFn: (importId: number) => deleteImport(portfolioId, importId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['imports', portfolioId] });
      void qc.invalidateQueries({ queryKey: ['holdings', portfolioId] });
      onSuccess?.();
    },
  });
}
