import apiClient from './client';
import type { TickerTags } from '../types/tag';

export async function getAllTags(): Promise<TickerTags[]> {
  const res = await apiClient.get<TickerTags[]>('tags');
  return res.data;
}

export async function getTagNames(): Promise<string[]> {
  const res = await apiClient.get<string[]>('tags/names');
  return res.data;
}

export async function getTickerTags(ticker: string): Promise<TickerTags> {
  const res = await apiClient.get<TickerTags>(`tags/${ticker}`);
  return res.data;
}

export async function setTickerTags(ticker: string, tags: string[]): Promise<TickerTags> {
  const res = await apiClient.put<TickerTags>(`tags/${ticker}`, { tags });
  return res.data;
}
