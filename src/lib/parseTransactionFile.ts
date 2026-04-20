import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { CreateTransactionPayload, Currency } from '../types/transaction';

type RawRow = Record<string, string>;

function mapRow(row: RawRow): CreateTransactionPayload | null {
  const ticker = (row['Ticker'] ?? '').trim().toUpperCase();
  const quantityRaw = parseFloat(row['Quantity'] ?? '');
  const price = parseFloat(row['Cost Per Share'] ?? '');
  const currency = ((row['Currency'] ?? 'USD').trim().toUpperCase()) as Currency;
  const date = (row['Date'] ?? '').trim();
  const commission = parseFloat(row['Commission'] ?? '0') || 0;

  if (!ticker || isNaN(quantityRaw) || isNaN(price) || !date) return null;

  const quantity = Math.abs(quantityRaw);
  const transactionType = quantityRaw < 0 ? 'SELL' : 'BUY';

  return {
    ticker,
    transactionType,
    assetType: 'STOCK',
    quantity,
    price,
    commission,
    date,
    currency,
  };
}

function parseRows(rows: RawRow[]): CreateTransactionPayload[] {
  const results: CreateTransactionPayload[] = [];
  for (const row of rows) {
    const mapped = mapRow(row);
    if (mapped) results.push(mapped);
  }
  if (results.length === 0) {
    throw new Error('No valid transactions found. Make sure the file has the expected columns: Ticker, Quantity, Cost Per Share, Currency, Date.');
  }
  return results;
}

function parseCsv(file: File): Promise<CreateTransactionPayload[]> {
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

function parseXlsx(file: File): Promise<CreateTransactionPayload[]> {
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

export async function parseTransactionFile(file: File): Promise<CreateTransactionPayload[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return parseCsv(file);
  if (ext === 'xlsx' || ext === 'xls') return parseXlsx(file);
  throw new Error(`Unsupported file type ".${ext}". Please upload a .csv or .xlsx file.`);
}
