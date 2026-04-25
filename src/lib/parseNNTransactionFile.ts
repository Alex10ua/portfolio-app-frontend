import * as XLSX from 'xlsx';
import type { CreateTransactionPayload } from '../types/transaction';

export const NN_TICKERS = new Set([
  'NN-INDEXOVY',
  'NN-KONZERVATIVNY',
  'NN-RASTOVY',
  'NN-VYVAZENY',
]);

export const NN_TICKER_DISPLAY_NAME: Record<string, string> = {
  'NN-INDEXOVY':      'NN Indexový fond',
  'NN-KONZERVATIVNY': 'NN Konzervatívny fond',
  'NN-RASTOVY':       'NN Rastový fond',
  'NN-VYVAZENY':      'NN Vyvážený fond',
};

const FUND_TICKER_MAP: Record<string, string> = {
  'Indexový':      'NN-INDEXOVY',
  'Konzervatívny': 'NN-KONZERVATIVNY',
  'Rastový':       'NN-RASTOVY',
  'Vyvážený':      'NN-VYVAZENY',
};

const COL_DATE       = 'Dátum transakcie';
const COL_FUND       = 'Názov fondu';
const COL_AMOUNT_EUR = 'Hodnota transakcie v €';
const COL_AMOUNT_DJ  = 'Hodnota transakcie v DJ';
const COL_PRICE_DJ   = 'Hodnota DJ v €';

export interface NNParseResult {
  transactions: CreateTransactionPayload[];
  skippedZeroCount: number;
  fingerprints: Map<string, string>;
  fundPrices: Map<string, number>;
  yearsPresent: Set<number>;
}

function excelSerialToISO(serial: number, date1904: boolean): string {
  // 1904 date system (used by NN Slovensko): epoch = 1904-01-01
  // 1900 date system (standard): epoch = 1899-12-30 (accounts for Lotus leap year bug)
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const date = new Date(epoch + serial * 86400000);
  return date.toISOString().slice(0, 10);
}

function parseDateCell(raw: unknown, date1904: boolean): string {
  if (typeof raw === 'number') return excelSerialToISO(raw, date1904);
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  if (typeof raw === 'string') return raw.trim();
  return '';
}

function mapFundName(name: string): string | null {
  return FUND_TICKER_MAP[name.trim()] ?? null;
}

export function buildNNFingerprint(
  date: string,
  ticker: string,
  quantity: number,
  price: number,
): string {
  return `${date}|${ticker}|${quantity.toFixed(5)}|${price.toFixed(5)}`;
}

function isNNFormat(keys: string[]): boolean {
  return keys.includes(COL_DATE) && keys.includes(COL_FUND);
}

function parseRows(jsonRows: Record<string, unknown>[], date1904: boolean): NNParseResult {
  const transactions: CreateTransactionPayload[] = [];
  const fingerprints = new Map<string, string>();
  const fundPrices = new Map<string, number>();
  const yearsPresent = new Set<number>();
  let skippedZeroCount = 0;

  for (const raw of jsonRows) {
    const amountEur = Number(raw[COL_AMOUNT_EUR] ?? 0);
    const amountDJ  = Number(raw[COL_AMOUNT_DJ]  ?? 0);

    if (Math.abs(amountEur) < 0.0001 && Math.abs(amountDJ) < 0.0001) {
      skippedZeroCount++;
      continue;
    }

    const date = parseDateCell(raw[COL_DATE], date1904);
    const fund = String(raw[COL_FUND] ?? '').trim();
    const ticker = mapFundName(fund);

    if (!ticker || !date) {
      if (fund) console.warn(`[NN parser] Unknown fund name: "${fund}" — row skipped`);
      continue;
    }

    const pricePerUnit = Number(raw[COL_PRICE_DJ] ?? 0);
    const quantity     = Math.abs(amountDJ);
    const transactionType = amountDJ >= 0 ? 'BUY' : 'SELL';

    // Newest-first: only store price for first occurrence per ticker
    if (!fundPrices.has(ticker) && pricePerUnit > 0) {
      fundPrices.set(ticker, pricePerUnit);
    }

    const tx: CreateTransactionPayload = {
      ticker,
      transactionType,
      assetType: 'CUSTOM',
      quantity,
      price: pricePerUnit,
      commission: 0,
      date,
      currency: 'EUR',
    };

    const fp = buildNNFingerprint(date, ticker, quantity, pricePerUnit);
    fingerprints.set(fp, ticker);
    yearsPresent.add(new Date(date).getFullYear());
    transactions.push(tx);
  }

  return { transactions, skippedZeroCount, fingerprints, fundPrices, yearsPresent };
}

export function tryParseNNFile(file: File): Promise<NNParseResult | null> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'xlsx' && ext !== 'xls') return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        if (jsonRows.length === 0) {
          resolve(null);
          return;
        }

        if (!isNNFormat(Object.keys(jsonRows[0]))) {
          resolve(null);
          return;
        }

        const date1904 = workbook.Workbook?.WBProps?.date1904 === true;
        resolve(parseRows(jsonRows, date1904));
      } catch (err) {
        reject(new Error(`NN parse error: ${(err as Error).message}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}
