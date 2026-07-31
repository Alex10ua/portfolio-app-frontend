export interface Column {
  key: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_COLUMNS: Column[] = [
  { key: 'ticker',              label: 'Holding',      visible: true  },
  { key: 'shareAmount',         label: 'Shares',       visible: true  },
  { key: 'costPerShare',        label: 'Cost/Share',   visible: true  },
  { key: 'currentShareValue',   label: 'Total Value',  visible: true  },
  { key: 'portfolioPercent',    label: '% of Portfolio', visible: true },
  { key: 'dividend',            label: 'Dividends',    visible: true  },
  { key: 'dividendYield',       label: 'Yield',        visible: true  },
  { key: 'dividendYieldOnCost', label: 'Yield on Cost',visible: true  },
  { key: 'totalProfit',         label: 'Total P&L',    visible: true  },
  { key: 'dailyChange',         label: 'Daily Change', visible: true  },
];

export function mergeColumns(saved: Column[]): Column[] {
  const defaults = new Map(DEFAULT_COLUMNS.map((c) => [c.key, c]));
  // Saved order wins; drop keys that no longer exist, take labels from defaults.
  const merged = saved
    .filter((c) => defaults.has(c.key))
    .map((c) => ({ ...defaults.get(c.key)!, visible: c.visible }));
  // Insert columns added since the config was saved at their default position.
  DEFAULT_COLUMNS.forEach((def, i) => {
    if (!merged.some((c) => c.key === def.key)) merged.splice(Math.min(i, merged.length), 0, def);
  });
  return merged;
}
