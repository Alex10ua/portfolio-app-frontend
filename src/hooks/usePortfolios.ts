import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPortfolios, createPortfolio } from '../api/portfolios';
import type { CreatePortfolioPayload } from '../types/portfolio';

export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: getPortfolios,
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePortfolioPayload) => createPortfolio(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}
