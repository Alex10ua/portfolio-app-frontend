import type { PropertyView } from './realEstate';

export interface WealthSummary {
  asOfDate: string;
  investmentValueByCurrency: Record<string, number>;
  ownedPropertyValueByCurrency: Record<string, number>;
  mortgagePrincipalByCurrency: Record<string, number>;
  propertyEquityByCurrency: Record<string, number>;
  manualCashByCurrency: Record<string, number>;
  properties: PropertyView[];
  investmentCount: number;
  complete: boolean;
  missingPropertyIds: string[];
  missingInvestmentTickers: string[];
}

export interface WealthHistoryPoint {
  date: string;
  investmentValueByCurrency: Record<string, number>;
  ownedPropertyValueByCurrency: Record<string, number>;
  mortgagePrincipalByCurrency: Record<string, number>;
  propertyEquityByCurrency: Record<string, number>;
  complete: boolean;
  missingPropertyIds: string[];
  estimatedPropertyIds: string[];
  estimatedPriceTickers: string[];
}
