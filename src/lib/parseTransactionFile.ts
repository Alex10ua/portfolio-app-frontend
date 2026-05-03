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

export async function parseTransactionFile(file: File): Promise<CreateTransactionPayload[]> {
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
