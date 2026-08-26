import type { CreateTransactionPayload, Currency } from '../types/transaction';
import type { AssetType } from '../types/holding';

type RawRow = Record<string, string>;

const ASSET_TYPES: AssetType[] = ['STOCK', 'FIGURINE', 'COIN', 'FUND', 'CRYPTO', 'CUSTOM'];

/** Types with no market provider — they need a `customAssets` definition to be manageable. */
const NON_MARKET_TYPES: AssetType[] = ['CUSTOM', 'COIN', 'FIGURINE', 'FUND'];

/**
 * Custom-asset definition derived from the optional columns. The batch-import
 * endpoint builds holdings straight off the transaction's name/priceNow, but the
 * `customAssets` collection still needs a document so the asset is manageable on
 * the Custom Assets page and skipped by the Flask custom-ticker guard.
 */
export interface CustomAssetSeed {
  ticker: string;
  name: string;
  assetType: string;
  country?: string;
  unit: string;
  currency: string;
  priceNow: number;
  /**
   * Starting price series: one point per transaction date, valued at the row's
   * `Price Now`. Every point therefore carries the current price, which matters
   * because the bulk-merge endpoint resets `priceNow` (and `MarketData.price`)
   * to the latest entry it receives — a series valued at cost would replace the
   * current price with the cost basis.
   */
  priceHistory: { date: string; price: number }[];
}

export interface GenericParseResult {
  transactions: CreateTransactionPayload[];
  /** ticker -> definition, for CUSTOM rows only; empty when the file has no custom-asset columns */
  customAssets: Map<string, CustomAssetSeed>;
  /** true when at least one row set an Asset Type — the modal's dropdown override is then suppressed */
  hasAssetTypeColumn: boolean;
}

function cell(row: RawRow, key: string): string {
  return (row[key] ?? '').toString().trim();
}

function parseAssetType(raw: string): AssetType | null {
  const upper = raw.toUpperCase();
  return (ASSET_TYPES as string[]).includes(upper) ? (upper as AssetType) : null;
}

function mapRow(row: RawRow): CreateTransactionPayload | null {
  const ticker = cell(row, 'Ticker').toUpperCase();
  const quantityRaw = parseFloat(row['Quantity'] ?? '');
  const price = parseFloat(row['Cost Per Share'] ?? '');
  const currency = (cell(row, 'Currency') || 'USD').toUpperCase() as Currency;
  const date = cell(row, 'Date');
  const commission = parseFloat(row['Commission'] ?? '0') || 0;

  if (!ticker || isNaN(quantityRaw) || isNaN(price) || !date) return null;

  const quantity = Math.abs(quantityRaw);
  const transactionType = quantityRaw < 0 ? 'SELL' : 'BUY';

  const payload: CreateTransactionPayload = {
    ticker,
    transactionType,
    assetType: parseAssetType(cell(row, 'Asset Type')) ?? 'STOCK',
    quantity,
    price,
    commission,
    date,
    currency,
  };

  // Non-market assets carry their own display name and current price — the
  // holding is built from these, there is no provider to fetch them from.
  const name = cell(row, 'Name');
  if (name) payload.name = name;
  const priceNow = parseFloat(row['Price Now'] ?? '');
  if (!isNaN(priceNow)) payload.priceNow = priceNow;

  return payload;
}

function seedFromRow(row: RawRow, tx: CreateTransactionPayload): CustomAssetSeed {
  return {
    ticker: tx.ticker,
    name: tx.name || tx.ticker,
    // Free-text category label on the definition — mirrors the transaction's type
    assetType: tx.assetType ?? 'CUSTOM',
    country: cell(row, 'Country') || undefined,
    unit: cell(row, 'Unit') || 'pcs',
    currency: tx.currency,
    priceNow: tx.priceNow != null ? Number(tx.priceNow) : Number(tx.price),
    priceHistory: [],
  };
}

function parseRows(rows: RawRow[]): GenericParseResult {
  const transactions: CreateTransactionPayload[] = [];
  const customAssets = new Map<string, CustomAssetSeed>();
  // ticker -> transaction date -> Price Now; first row per (ticker, date) wins so
  // two purchases of the same item on one day resolve deterministically
  const historyByTicker = new Map<string, Map<string, number>>();
  let hasAssetTypeColumn = false;

  for (const row of rows) {
    const mapped = mapRow(row);
    if (!mapped) continue;
    if (parseAssetType(cell(row, 'Asset Type'))) hasAssetTypeColumn = true;
    // First row per ticker wins — a repeat purchase of the same coin must not
    // overwrite the definition with a second, identical one.
    if (NON_MARKET_TYPES.includes(mapped.assetType!)) {
      if (!customAssets.has(mapped.ticker)) {
        customAssets.set(mapped.ticker, seedFromRow(row, mapped));
      }
      const byDate = historyByTicker.get(mapped.ticker) ?? new Map<string, number>();
      if (!byDate.has(mapped.date)) {
        byDate.set(mapped.date, Number(mapped.priceNow ?? mapped.price));
      }
      historyByTicker.set(mapped.ticker, byDate);
    }
    transactions.push(mapped);
  }

  for (const seed of customAssets.values()) {
    const byDate = historyByTicker.get(seed.ticker) ?? new Map<string, number>();
    seed.priceHistory = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, price]) => ({ date, price }));
  }

  if (transactions.length === 0) {
    throw new Error('No valid transactions found. Make sure the file has the expected columns: Ticker, Quantity, Cost Per Share, Currency, Date.');
  }
  return { transactions, customAssets, hasAssetTypeColumn };
}

async function parseCsv(file: File): Promise<GenericParseResult> {
  const Papa = (await import('papaparse')).default; // code-split: only when importing
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0 && result.data.length === 0) {
          reject(new Error(`CSV parse error: ${result.errors[0].message}`));
          return;
        }
        try {
          resolve(parseRows(result.data));
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(new Error(`CSV parse error: ${err.message}`)),
    });
  });
}

async function parseXlsx(file: File): Promise<GenericParseResult> {
  const XLSX = await import('xlsx'); // code-split: only when importing
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' });
        resolve(parseRows(jsonRows));
      } catch (err) {
        reject(new Error(`XLSX parse error: ${(err as Error).message}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

async function validateFileSignature(file: File, expectedType: 'csv' | 'xlsx'): Promise<void> {
  const buffer = await file.slice(0, 4).arrayBuffer();
  const b = new Uint8Array(buffer);
  const isZip = b[0] === 0x50 && b[1] === 0x4B;
  const isOle = b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0;
  const isSpreadsheet = isZip || isOle;
  if (expectedType === 'xlsx' && !isSpreadsheet) {
    throw new Error('File content does not match a valid Excel file. The file may be corrupt or misnamed.');
  }
  if (expectedType === 'csv' && isSpreadsheet) {
    throw new Error('File content does not match a valid CSV text file. The file may be corrupt or misnamed.');
  }
}

export async function parseTransactionFile(file: File): Promise<GenericParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') {
    await validateFileSignature(file, 'csv');
    return parseCsv(file);
  }
  if (ext === 'xlsx' || ext === 'xls') {
    await validateFileSignature(file, 'xlsx');
    return parseXlsx(file);
  }
  throw new Error(`Unsupported file type ".${ext}". Please upload a .csv or .xlsx file.`);
}
