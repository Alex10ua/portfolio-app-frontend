import Papa from 'papaparse';
import type { CreateTransactionPayload, Currency, TransactionType } from '../types/transaction';

type Row = string[];

interface SectionData {
  headers: string[];
  rows: Row[];
}

// Detect if the file looks like an IB Activity Statement CSV
export function isIBActivityStatement(rows: Row[]): boolean {
  return rows.some((r) => r[0] === 'Statement' && r[1] === 'Header');
}

function parseSections(rawRows: Row[]): Map<string, SectionData> {
  const sections = new Map<string, SectionData>();
  for (const row of rawRows) {
    if (row.length < 3) continue;
    const section = row[0];
    const discriminator = row[1];
    if (!sections.has(section)) {
      sections.set(section, { headers: [], rows: [] });
    }
    const s = sections.get(section)!;
    const data = row.slice(2);
    if (discriminator === 'Header') {
      s.headers = data;
    } else if (discriminator === 'Data') {
      s.rows.push(data);
    }
    // SubTotal and Total rows are intentionally skipped
  }
  return sections;
}

function toMap(headers: string[], row: Row): Record<string, string> {
  const m: Record<string, string> = {};
  headers.forEach((h, i) => { m[h] = (row[i] ?? '').trim(); });
  return m;
}

// Extract ticker from IB description like "GOOGL(US02079K3059) Cash Dividend..."
function extractTicker(description: string): string {
  const match = description.match(/^([A-Z0-9./ ]+)\(/);
  return match ? match[1].trim() : '';
}

// "2024-10-07, 13:56:32" → "2024-10-07"
function parseDate(raw: string): string {
  return raw.split(',')[0].trim();
}

function parseTrades(section: SectionData): CreateTransactionPayload[] {
  const results: CreateTransactionPayload[] = [];
  for (const row of section.rows) {
    const d = toMap(section.headers, row);
    if (d['DataDiscriminator'] !== 'Order') continue;
    if (d['Asset Category'] !== 'Stocks') continue;

    const ticker = d['Symbol'];
    const quantityRaw = parseFloat(d['Quantity'] ?? '');
    const price = parseFloat(d['T. Price'] ?? '');
    const commRaw = parseFloat(d['Comm/Fee'] ?? '0');
    const currency = ((d['Currency'] ?? 'USD') as Currency);
    const date = parseDate(d['Date/Time'] ?? '');

    if (!ticker || isNaN(quantityRaw) || isNaN(price) || !date) continue;

    results.push({
      ticker,
      transactionType: quantityRaw < 0 ? 'SELL' : 'BUY',
      assetType: 'STOCK',
      quantity: Math.abs(quantityRaw),
      price,
      commission: Math.abs(commRaw),
      date,
      currency,
    });
  }
  return results;
}

function parseDividends(section: SectionData): CreateTransactionPayload[] {
  const results: CreateTransactionPayload[] = [];
  for (const row of section.rows) {
    const d = toMap(section.headers, row);
    const currency = (d['Currency'] ?? 'USD') as Currency;
    const date = d['Date'] ?? '';
    const description = d['Description'] ?? '';
    const amount = parseFloat(d['Amount'] ?? '');

    if (!date || isNaN(amount) || amount <= 0) continue;

    const ticker = extractTicker(description);
    if (!ticker) continue;

    results.push({
      ticker,
      transactionType: 'DIVIDEND',
      assetType: 'STOCK',
      quantity: 0,
      price: 0,
      commission: 0,
      amount,
      date,
      currency,
    });
  }
  return results;
}

function parseWithholdingTax(section: SectionData): CreateTransactionPayload[] {
  const results: CreateTransactionPayload[] = [];
  for (const row of section.rows) {
    const d = toMap(section.headers, row);
    const currency = (d['Currency'] ?? 'USD') as Currency;
    const date = d['Date'] ?? '';
    const description = d['Description'] ?? '';
    const amount = parseFloat(d['Amount'] ?? '');

    if (!date || isNaN(amount) || amount === 0) continue;

    const ticker = extractTicker(description);
    if (!ticker) continue;

    results.push({
      ticker,
      transactionType: 'TAX',
      assetType: 'STOCK',
      quantity: 0,
      price: 0,
      commission: 0,
      amount: Math.abs(amount),
      date,
      currency,
    });
  }
  return results;
}

function parseDepositsWithdrawals(section: SectionData): CreateTransactionPayload[] {
  const results: CreateTransactionPayload[] = [];
  for (const row of section.rows) {
    const d = toMap(section.headers, row);
    const currencyRaw = d['Currency'] ?? '';
    // Skip summary rows (Total, Total in USD, Total Deposits & Withdrawals in USD)
    if (currencyRaw === 'Total' || !currencyRaw || !d['Settle Date']) continue;
    const currency = currencyRaw as Currency;

    const date = d['Settle Date'] ?? '';
    const amount = parseFloat(d['Amount'] ?? '');

    if (!date || isNaN(amount) || amount === 0) continue;

    const transactionType: TransactionType = amount > 0 ? 'DEPOSIT' : 'WITHDRAWAL';
    results.push({
      ticker: currency,
      transactionType,
      // No assetType for cash transactions
      quantity: 0,
      price: 0,
      commission: 0,
      amount: Math.abs(amount),
      date,
      currency,
    });
  }
  return results;
}

function parseIBRows(rawRows: Row[]): CreateTransactionPayload[] {
  const sections = parseSections(rawRows);
  const results: CreateTransactionPayload[] = [];

  const trades = sections.get('Trades');
  if (trades) results.push(...parseTrades(trades));

  const dividends = sections.get('Dividends');
  if (dividends) results.push(...parseDividends(dividends));

  const tax = sections.get('Withholding Tax');
  if (tax) results.push(...parseWithholdingTax(tax));

  const cash = sections.get('Deposits & Withdrawals');
  if (cash) results.push(...parseDepositsWithdrawals(cash));

  return results;
}

/**
 * Tries to parse the file as an IB Activity Statement CSV.
 * Returns parsed transactions if the file is recognized as IB format, null otherwise.
 */
export function tryParseIBActivityStatement(file: File): Promise<CreateTransactionPayload[] | null> {
  return new Promise((resolve, reject) => {
    Papa.parse<Row>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const rows = result.data as Row[];
          if (!isIBActivityStatement(rows)) {
            resolve(null);
            return;
          }
          resolve(parseIBRows(rows));
        } catch (e) {
          reject(new Error(`IB CSV parse error: ${(e as Error).message}`));
        }
      },
      error: (err) => reject(new Error(`CSV parse error: ${err.message}`)),
    });
  });
}
