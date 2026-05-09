import type { AssetType } from './holding';

export type TransactionType = 'BUY' | 'SELL' | 'TAX' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CHF' | 'PLN' | 'CZK';

export interface Transaction {
  transactionId: number;
  ticker: string;
  transactionType: TransactionType;
  assetType: AssetType;
  quantity: number;
  price: number;
  amount: number | null;
  totalAmount: number | null;
  commission: number | null;
  date: string;
  currency: Currency;
  fxRate?: number; // rateVsEur for this transaction's currency
}

export interface CreateTransactionPayload {
  ticker: string;
  transactionType: TransactionType;
  assetType?: AssetType;
  quantity: number | string;
  price: number | string;
  commission: number | string;
  date: string;
  currency: Currency;
  amount?: number | string;
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
