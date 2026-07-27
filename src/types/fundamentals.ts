export interface FundamentalEntry {
  date: string; // 'YYYY-MM-DD'
  value: number;
  form: string;
  filed: string;
}

export interface CompanyFundamentals {
  ticker: string;
  concepts: Record<string, FundamentalEntry[]>;
  updatedAt?: string;
}
