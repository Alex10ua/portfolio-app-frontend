import type { Mortgage, MortgageSummary } from './mortgage';

export type PropertyType = 'APARTMENT' | 'HOUSE' | 'LAND' | 'COMMERCIAL' | 'OTHER';
export type PropertyUsage = 'HOME' | 'RENTAL' | 'OTHER';
export type FinancingStatus = 'MORTGAGE_FREE' | 'MORTGAGE_SETUP_PENDING' | 'MORTGAGE_RECORDED';
export type ValuationSource = 'OWNER_ESTIMATE' | 'APPRAISAL' | 'PURCHASE';

export interface PropertyValuation {
  id: string;
  effectiveDate: string;
  fullPropertyValue: number;
  source: ValuationSource;
  note?: string | null;
  recordedAt?: string | null;
}

export interface RealEstateProperty {
  id: string;
  portfolioId: string;
  name: string;
  propertyType: PropertyType;
  usage: PropertyUsage;
  currency: string;
  country?: string | null;
  location?: string | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  acquisitionCosts?: number | null;
  ownershipShare: number;
  trackingStartDate: string;
  financingStatus: FinancingStatus;
  status: 'ACTIVE' | 'ARCHIVED';
  archiveDate?: string | null;
  notes?: string | null;
  valuations: PropertyValuation[];
  version: number;
}

export interface PropertyView {
  property: RealEstateProperty;
  mortgages: Mortgage[];
  latestValuation: PropertyValuation | null;
  fullValue: number | null;
  ownedValue: number | null;
  attributedMortgagePrincipal: number | null;
  equity: number | null;
  complete: boolean;
  /** Every loan not closed before the view date, by mortgage id. */
  loanSummaries: Record<string, MortgageSummary>;
  /** The open loans together; null when none is open. */
  debt: DebtStatus | null;
}

/** Least certain balance and every warning (named by loan when there are several) of the open loans. */
export interface DebtStatus {
  provenance: MortgageSummary['balance']['provenance'];
  rateNeeded: boolean;
  partialPeriodUnsupported: boolean;
  warnings: string[];
  /** Sum of the installments still being paid; null when any of them is unknown. */
  attributedMonthlyPayment: number | null;
  nextDueDate: string | null;
  /** Loans that need a new rate or the bank's figures. */
  loansNeedingAttention: string[];
}

export interface PropertyHistoryPoint {
  date: string;
  fullValue: number | null;
  ownedValue: number | null;
  attributedMortgagePrincipal: number | null;
  equity: number | null;
  complete: boolean;
  provenance: string;
  warnings: string[];
}

export type DecimalInput = string | number;
export interface PropertyPayload {
  name: string;
  propertyType: PropertyType;
  usage: PropertyUsage;
  currency: string;
  country?: string;
  location?: string;
  purchaseDate?: string | null;
  purchasePrice?: DecimalInput | null;
  acquisitionCosts?: DecimalInput | null;
  ownershipShare: DecimalInput;
  trackingStartDate: string;
  financingStatus: FinancingStatus;
  notes?: string;
  version?: number;
  valuationDate?: string;
  fullPropertyValue?: DecimalInput;
  valuationSource?: ValuationSource;
}

export interface ValuationPayload {
  effectiveDate: string;
  fullPropertyValue: DecimalInput;
  source: ValuationSource;
  note?: string;
  version?: number;
}
