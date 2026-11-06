import type { DecimalInput } from './realEstate';

export type BalanceTrackingMode = 'STATEMENT_ONLY' | 'SCHEDULE_ESTIMATE';
export interface MortgageRatePeriod {
  id: string;
  effectiveFrom: string;
  fixedUntil: string;
  annualNominalRatePercent: number;
  monthlyPayment?: number | null;
  paymentSource?: 'BANK_AGREED' | 'CALCULATED' | null;
  anchorDate?: string | null;
  calculationPrincipal?: number | null;
  remainingPaymentCount?: number | null;
  source?: string | null;
}
export interface MortgageCheckpoint {
  id: string;
  asOfDate: string;
  principalBalance: number;
  source: 'BANK_STATEMENT' | 'USER_CONFIRMED';
  note?: string | null;
  recordedAt?: string | null;
}
export interface MortgagePayment {
  id: string;
  paymentDate: string;
  scheduledDueDate?: string | null;
  principalPaid: number;
  extraPrincipalPaid: number;
  interestPaid: number;
  feesPaid: number;
  note?: string | null;
  /** The extra principal lowered the installment (same end date) instead of ending the loan sooner. */
  lowerInstallment?: boolean | null;
  /** The bank's installment after it; null = calculated over the installments left. */
  newInstallment?: number | null;
  /** Paid into a building savings loan's savings account (before its switch). */
  savingsPaid?: number | null;
  recordedAt?: string | null;
}
export interface SavingsCheckpoint {
  id: string;
  asOfDate: string;
  balance: number;
  source: 'BANK_STATEMENT' | 'USER_CONFIRMED';
  note?: string | null;
  recordedAt?: string | null;
}
/**
 * A building savings loan (e.g. PSS môjÚVER): an interest-only bridging loan beside a savings account
 * until the target amount is allocated; then the savings repay part of it and the rest is a building loan.
 */
export interface BuildingSavings {
  monthlyDeposit: number;
  savingsRatePercent?: number | null;
  /** Expected allocation; the switch falls on the first installment date from it. */
  allocationDate: string;
  buildingLoanRatePercent: number;
  /** The bank's building-loan installment; null = calculated. */
  buildingLoanPayment?: number | null;
  savingsCheckpoints: SavingsCheckpoint[];
}
export interface Mortgage {
  id: string;
  portfolioId: string;
  propertyId: string;
  name?: string | null;
  lender?: string | null;
  currency: string;
  originalPrincipal?: number | null;
  loanStartDate: string;
  firstPaymentDate: string;
  maturityDate: string;
  paymentDay: number;
  debtAllocationShare: number;
  balanceTrackingMode: BalanceTrackingMode;
  status: 'ACTIVE' | 'CLOSED';
  closeDate?: string | null;
  ratePeriods: MortgageRatePeriod[];
  balanceCheckpoints: MortgageCheckpoint[];
  payments: MortgagePayment[];
  /** Null for an annuity loan. */
  buildingSavings?: BuildingSavings | null;
  version: number;
}

export interface MortgageBalance {
  principalBalance: number | null;
  asOfDate: string | null;
  lastConfirmedDate: string | null;
  provenance: 'CONFIRMED' | 'CARRIED' | 'ESTIMATED' | 'PAUSED' | 'UNKNOWN';
  rateNeeded: boolean;
  partialPeriodUnsupported: boolean;
  warnings: string[];
  /** A building savings loan's savings account (0 after its switch); null for an annuity loan. */
  savingsBalance?: number | null;
}
export interface MortgageSummary {
  balance: MortgageBalance;
  monthlyPayment: number | null;
  attributedMonthlyPayment: number | null;
  nextDueDate: string | null;
  currentRatePeriod: MortgageRatePeriod | null;
  lastRatePeriod: MortgageRatePeriod | null;
  remainingPaymentCount: number;
  projectedPayoffDate: string | null;
  recordedPrincipal: number;
  recordedInterest: number;
  recordedFees: number;
  /** Building savings loan: the switch to the building loan, what the savings repay there and the building loan left. */
  switchDate?: string | null;
  savingsAtSwitch?: number | null;
  buildingLoanAtSwitch?: number | null;
}
export interface MortgageScheduleRow {
  date: string;
  kind: 'OPENING' | 'INSTALLMENT' | 'PAYMENT' | 'CHECKPOINT' | 'RATE_NEEDED' | 'UNSUPPORTED_PERIOD' | 'PAID_OFF' | 'SAVINGS_CHECKPOINT' | 'SWITCH';
  scheduledDueDate: string | null;
  principal: number | null;
  extraPrincipal: number | null;
  interest: number | null;
  fees: number | null;
  total: number | null;
  balance: number | null;
  provenance: 'CONFIRMED' | 'CARRIED' | 'ESTIMATED' | 'PROJECTED' | 'UNRECORDED' | 'PAUSED' | 'UNKNOWN';
  annualNominalRatePercent: number | null;
  note: string | null;
  /** Building savings loan only: paid into savings on this row (negative at the switch), and the savings balance. */
  savings?: number | null;
  savingsBalance?: number | null;
}
export interface MortgagePayload {
  lender?: string;
  name?: string;
  currency: string;
  originalPrincipal?: DecimalInput | null;
  loanStartDate: string;
  firstPaymentDate: string;
  maturityDate: string;
  paymentDay: number;
  debtAllocationShare: DecimalInput;
  balanceTrackingMode: BalanceTrackingMode;
  openingBalance: CheckpointPayload;
  ratePeriod?: RatePeriodPayload | null;
  /** Null = an annuity loan; on an update, unchanged. savingsBalance is read on setup only. */
  buildingSavings?: BuildingSavingsPayload | null;
  version?: number;
  propertyVersion?: number;
}
export interface PaymentPayload {
  paymentDate: string;
  scheduledDueDate?: string | null;
  principalPaid: DecimalInput;
  extraPrincipalPaid: DecimalInput;
  interestPaid: DecimalInput;
  feesPaid: DecimalInput;
  note?: string;
  lowerInstallment?: boolean | null;
  newInstallment?: DecimalInput | null;
  savingsPaid?: DecimalInput | null;
  version?: number;
}
export interface BuildingSavingsPayload {
  monthlyDeposit: DecimalInput;
  savingsBalance?: DecimalInput | null;
  savingsRatePercent?: DecimalInput | null;
  allocationDate: string;
  buildingLoanRatePercent: DecimalInput;
  buildingLoanPayment?: DecimalInput | null;
}
export interface SavingsPayload {
  asOfDate: string;
  balance: DecimalInput;
  source: 'BANK_STATEMENT' | 'USER_CONFIRMED';
  note?: string;
  version?: number;
}
/** One unsaved projection; remainingInterest counts from today. */
export interface ExtraPaymentOutcome {
  installment: number | null;
  payoffDate: string | null;
  remainingInterest: number;
  installmentsLeft: number;
}
/** The loan as it is, then with the extra payment ending it sooner or lowering the installment. */
export interface ExtraPaymentPreview {
  date: string;
  amount: number;
  current: ExtraPaymentOutcome;
  keepInstallment: ExtraPaymentOutcome;
  lowerInstallment: ExtraPaymentOutcome;
  /** Set when this rate was carried past assumedAfter, the end of the last agreed fixation. */
  assumedRatePercent: number | null;
  assumedAfter: string | null;
}
export interface CheckpointPayload {
  asOfDate: string;
  principalBalance: DecimalInput;
  source: 'BANK_STATEMENT' | 'USER_CONFIRMED';
  note?: string;
  version?: number;
}
export interface RatePeriodPayload {
  effectiveFrom: string;
  fixedUntil: string;
  annualNominalRatePercent: DecimalInput;
  monthlyPayment?: DecimalInput | null;
  paymentSource?: 'BANK_AGREED' | 'CALCULATED';
  version?: number;
}
