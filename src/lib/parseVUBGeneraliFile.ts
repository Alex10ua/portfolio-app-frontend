import * as XLSX from 'xlsx';
import type { CreateTransactionPayload } from '../types/transaction';

const COL_DATE   = 'Dátum pripísania';
const COL_AMOUNT = 'Hodnota obratu';
const COL_FUND   = 'Názov dôchodkového fondu';
const COL_UNITS  = 'Počet dôchodkových jednotiek v DF';
const COL_PRICE  = 'Hodnota dôchodkovej jednotky DF';

export interface VUBParseResult {
  transactions: CreateTransactionPayload[];
  skippedZeroCount: number;
  fingerprints: Map<string, string>;
  fundPrices:   Map<string, number>;
  yearsPresent: Set<number>;
}

// Handles Slovak locale numbers:
//   ",136981000000"  →  0.136981   (leading-comma = 0.something)
//   "-,136981000000" → -0.136981
//   "239,4000000000" →  239.4      (comma as decimal separator)
function parseSlovakNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (raw == null) return 0;
  let s = String(raw).trim();
  if (s === '' || s === '-') return 0;

  if (/^-?,/.test(s)) {
    s = s.replace(/^(-?),/, '$10.');
  } else {
    s = s.replace(',', '.');
  }

  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDDMMYYYY(raw: unknown): string {
  const s = String(raw ?? '').trim();
  const match = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return '';
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function deriveTicker(fundName: string): string {
  const part = fundName.split(' - ')[0].trim();
  return 'VUB-DDS-' + part.toUpperCase().replace(/\s+/g, '-');
}

export function vubTickerDisplayName(ticker: string): string {
  const suffix = ticker.replace(/^VUB-DDS-/, '').replace(/-/g, ' ');
  return `VUB Generali ${suffix}`;
}

export function buildVUBFingerprint(
  date: string,
  ticker: string,
  quantity: number,
  price: number,
): string {
  return `${date}|${ticker}|${quantity.toFixed(6)}|${price.toFixed(9)}`;
}

function isVUBFormat(keys: string[]): boolean {
  return keys.includes(COL_DATE) && keys.includes(COL_UNITS);
}

function parseRows(jsonRows: Record<string, unknown>[]): VUBParseResult {
  const transactions: CreateTransactionPayload[] = [];
  const fingerprints = new Map<string, string>();
  const fundPrices   = new Map<string, number>();
  const yearsPresent = new Set<number>();
  let skippedZeroCount = 0;

  for (const raw of jsonRows) {
    const units  = parseSlovakNumber(raw[COL_UNITS]);
    const amount = parseSlovakNumber(raw[COL_AMOUNT]);

    if (Math.abs(units) < 0.000001 && Math.abs(amount) < 0.000001) {
      skippedZeroCount++;
      continue;
    }

    const date     = parseDDMMYYYY(raw[COL_DATE]);
    const fundName = String(raw[COL_FUND] ?? '').trim();
    const price    = parseSlovakNumber(raw[COL_PRICE]);

    if (!date || !fundName) continue;

    const ticker          = deriveTicker(fundName);
    const quantity        = Math.abs(units);
    const transactionType = units >= 0 ? 'BUY' : 'SELL';

    // File is newest-first: first occurrence per ticker = most recent price
    if (!fundPrices.has(ticker) && price > 0) {
      fundPrices.set(ticker, price);
    }

    const tx: CreateTransactionPayload = {
      ticker,
      transactionType,
      assetType: 'CUSTOM',
      quantity,
      price,
      commission: 0,
      date,
      currency: 'EUR',
    };

    const fp = buildVUBFingerprint(date, ticker, quantity, price);
    fingerprints.set(fp, ticker);
    yearsPresent.add(new Date(date).getFullYear());
    transactions.push(tx);
  }

  return { transactions, skippedZeroCount, fingerprints, fundPrices, yearsPresent };
}

export function tryParseVUBFile(file: File): Promise<VUBParseResult | null> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'xlsx' && ext !== 'xls') return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        if (jsonRows.length === 0) { resolve(null); return; }

        if (!isVUBFormat(Object.keys(jsonRows[0]))) { resolve(null); return; }

        resolve(parseRows(jsonRows));
      } catch (err) {
        reject(new Error(`VUB Generali parse error: ${(err as Error).message}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}
