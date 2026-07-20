export interface TableColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

export interface PortfolioSettings {
  tableConfig?: TableColumnConfig[];
  chartStartMonth?: string; // 'YYYY-MM'
}

export interface UserSettings {
  theme: 'light' | 'dark' | null; // null = follow OS preference
  portfolioSettings: Record<string, PortfolioSettings>;
}
