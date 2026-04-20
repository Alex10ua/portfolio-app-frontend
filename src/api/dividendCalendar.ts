import apiClient from './client';
import type { DividendCalendarData } from '../types/dividendCalendar';

export async function getDividendCalendar(portfolioId: string): Promise<DividendCalendarData> {
  const response = await apiClient.get<DividendCalendarData>(`${portfolioId}/dividends-calendar`);
  return response.data;
}
