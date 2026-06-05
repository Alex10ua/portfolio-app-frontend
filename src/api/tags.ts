import apiClient from './client';
import type { TickerTags } from '../types/tag';

export async function getAllTags(portfolioId: string): Promise<TickerTags[]> {
  const res = await apiClient.get<TickerTags[]>('tags', { params: { portfolioId } });
  return res.data;
}

export async function getTagNames(portfolioId: string): Promise<string[]> {
  const res = await apiClient.get<string[]>('tags/names', { params: { portfolioId } });
  return res.data;
}

export async function getTickerTags(portfolioId: string, ticker: string): Promise<TickerTags> {
  const res = await apiClient.get<TickerTags>(`tags/${ticker}`, { params: { portfolioId } });
  return res.data;
}

export async function setTickerTags(portfolioId: string, ticker: string, tags: string[]): Promise<TickerTags> {
  const res = await apiClient.put<TickerTags>(`tags/${ticker}`, { tags }, { params: { portfolioId } });
  return res.data;
}
