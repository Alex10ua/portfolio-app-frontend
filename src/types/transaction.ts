import type { AssetType } from './holding';

export type TransactionType = 'BUY' | 'SELL' | 'TAX' | 'DIVIDEND';
export type Currency = 'USD' | 'EUR' | 'GBP';

export interface Transaction {
  transactionId: number;
  ticker: string;
  transactionType: TransactionType;
  assetType: AssetType;
  quantity: number;
  price: number;
  totalAmount: number | null;
  commission: number | null;
  date: string;
  currency: Currency;
}

export interface CreateTransactionPayload {
  ticker: string;
  transactionType: TransactionType;
  assetType: AssetType;
  quantity: number | string;
  price: number | string;
  commission: number | string;
  date: string;
  currency: Currency;
  name?: string;
  priceNow?: number | string;
}

export interface UpdateTransactionPayload {
  ticker: string;
  transactionType: TransactionType;
  assetType: AssetType;
  quantity: number;
  price: number;
  commission: number;
  date: string;
  currency: Currency;
}
