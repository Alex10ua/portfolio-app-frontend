import type { Transaction } from './transaction';
import type { CreateTransactionPayload } from './transaction';

export interface ImportRecord {
  id: string;
  filename?: string;
  name?: string;
  uploadedAt?: string;
  transactionCount?: number;
}

export interface ImportDetail {
  filename?: string;
  name?: string;
  transactions?: Transaction[];
  batch?: ImportRecord;
}

export interface ImportBatchPayload {
  filename: string;
  transactions: CreateTransactionPayload[];
}
