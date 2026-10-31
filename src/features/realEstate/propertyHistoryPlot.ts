import type { PropertyHistoryPoint } from '../../types/realEstate';
import type { MortgageScheduleRow } from '../../types/mortgage';

export type PropertySeries = 'equity' | 'ownedValue' | 'attributedMortgagePrincipal' | 'fullValue';
export interface PropertyPlotPoint {
  date: string;
  equity: number | null;
  ownedValue: number | null;
  attributedMortgagePrincipal: number | null;
  fullValue: number | null;
  provenance: string;
  phase: 'TRACKED' | 'PROJECTED';
  projectedEquity?: number | null;
  projectedDebt?: number | null;
  projectedOwnedValue?: number | null;
  projectedFullValue?: number | null;
}

export const projectedPropertyKey: Record<PropertySeries, 'projectedEquity' | 'projectedDebt' | 'projectedOwnedValue' | 'projectedFullValue'> = {
  equity: 'projectedEquity',
  attributedMortgagePrincipal: 'projectedDebt',
  ownedValue: 'projectedOwnedValue',
  fullValue: 'projectedFullValue',
};

export interface PropertyProjection {
  today: string;
  /**
   * One entry per open loan. Between a loan's own schedule rows its balance carries forward,
   * starting from `startBalance` (today's); an unknown balance on any loan leaves the debt unknown.
   */
  loans: { rows: MortgageScheduleRow[]; allocationShare: number; startBalance: number | null }[];
  ownedValue: number | null;
  fullValue: number | null;
}

/** Future assumptions have separate data keys so a solid history line can never include them. */
export function buildPropertyPlot(history: PropertyHistoryPoint[], projection?: PropertyProjection): PropertyPlotPoint[] {
  const points: PropertyPlotPoint[] = history.map(point => ({
    date: point.date,
    equity: point.complete ? point.equity : null,
    ownedValue: point.ownedValue,
    attributedMortgagePrincipal: point.attributedMortgagePrincipal,
    fullValue: point.fullValue,
    provenance: point.provenance,
    phase: 'TRACKED',
  }));
  if (!projection) return points;

  const last = points[points.length - 1];
  if (last) {
    last.projectedEquity = last.equity;
    last.projectedDebt = last.attributedMortgagePrincipal;
    last.projectedOwnedValue = last.ownedValue;
    last.projectedFullValue = last.fullValue;
  }
  const future = projection.loans.map(loan => loan.rows.filter(row => row.date > projection.today && row.provenance === 'PROJECTED'));
  const balances = projection.loans.map(loan => loan.startBalance), read = future.map(() => 0);
  for (const date of [...new Set(future.flat().map(row => row.date))].sort()) {
    future.forEach((rows, i) => { while (read[i] < rows.length && rows[read[i]].date <= date) balances[i] = rows[read[i]++].balance; });
    const debt = balances.some(balance => balance == null) ? null
      : balances.reduce<number>((sum, balance, i) => sum + (balance as number) * projection.loans[i].allocationShare, 0);
    points.push({
      date,
      equity: null,
      ownedValue: null,
      attributedMortgagePrincipal: null,
      fullValue: null,
      projectedDebt: debt,
      projectedEquity: debt == null || projection.ownedValue == null ? null : projection.ownedValue - debt,
      projectedOwnedValue: projection.ownedValue,
      projectedFullValue: projection.fullValue,
      provenance: 'PROJECTED',
      phase: 'PROJECTED',
    });
  }
  return points;
}

export function propertyPlotValue(point: PropertyPlotPoint, key: PropertySeries): number | null | undefined {
  return point.phase === 'PROJECTED' ? point[projectedPropertyKey[key]] : point[key];
}
