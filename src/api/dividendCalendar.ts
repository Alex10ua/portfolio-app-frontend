import apiClient from './client';
import type { DividendCalendarData } from '../types/dividendCalendar';

/**
 * Month name → payments. Omit `year` for the rolling projection (what the
 * Self-Funding page reads); pass one to pin the calendar to that year.
 */
export async function getDividendCalendar(
  portfolioId: string,
  year?: number,
): Promise<DividendCalendarData> {
  const response = await apiClient.get<DividendCalendarData>(
    `${portfolioId}/dividends-calendar`,
    year === undefined ? undefined : { params: { year } },
  );
  return response.data;
}
