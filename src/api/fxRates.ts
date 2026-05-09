import apiClient from './client';
import type { FxRates } from '../types/fxRate';

export const getFxRates = async (): Promise<FxRates> => {
  const response = await apiClient.get<FxRates>('fx-rates');
  return response.data;
};
