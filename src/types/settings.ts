export interface TableColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

export type ChartRange = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';

export interface PortfolioSettings {
  tableConfig?: TableColumnConfig[];
  chartRange?: ChartRange;  // value-chart window; default YTD
  sortBy?: string;          // holdings-table column key
  sortOrder?: 'asc' | 'desc';
  assetFilter?: string;     // 'ALL' or an AssetType
}

export interface UserSettings {
  theme: 'light' | 'dark' | null; // null = follow OS preference
  portfolioSettings: Record<string, PortfolioSettings>;
}
