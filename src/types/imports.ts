import type { Transaction } from './transaction';

export interface ImportRecord {
  id: number;
  filename?: string;
  name?: string;
  uploadedAt?: string;
}

export interface ImportDetail {
  filename?: string;
  name?: string;
  transactions?: Transaction[];
}
