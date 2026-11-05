import type { TransactionType } from '../components/financeTypes';

export interface ScanReceiptResult {
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string | null;
}

export class ScanReceiptValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScanReceiptValidationError';
  }
}

export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function normalizeScanReceiptResult(value: unknown, allowedCategories: string[]): ScanReceiptResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ScanReceiptValidationError('Hasil scan tidak valid.');
  }

  const result = value as Record<string, unknown>;
  if (result.type !== 'income' && result.type !== 'expense') {
    throw new ScanReceiptValidationError('Tipe transaksi dari hasil scan tidak valid.');
  }
  if (typeof result.amount !== 'number' || !Number.isSafeInteger(result.amount) || result.amount <= 0) {
    throw new ScanReceiptValidationError('Nominal dari hasil scan tidak valid.');
  }
  if (typeof result.category !== 'string' || !result.category.trim()) {
    throw new ScanReceiptValidationError('Kategori dari hasil scan tidak valid.');
  }
  if (typeof result.note !== 'string' || result.note.length > 50) {
    throw new ScanReceiptValidationError('Catatan dari hasil scan tidak valid.');
  }

  let date: string | null = null;
  if (result.date !== null && result.date !== undefined && result.date !== '') {
    if (typeof result.date !== 'string' || !isDateOnly(result.date)) {
      throw new ScanReceiptValidationError('Tanggal dari hasil scan tidak valid.');
    }
    date = result.date;
  }

  const category = result.category.trim();
  const categories = allowedCategories.length > 0 ? allowedCategories : ['Lainnya'];
  if (!categories.includes(category)) {
    if (!categories.includes('Lainnya')) {
      throw new ScanReceiptValidationError('Kategori dari hasil scan tidak tersedia.');
    }
    return { type: result.type, amount: result.amount, category: 'Lainnya', note: result.note.trim(), date };
  }

  return { type: result.type, amount: result.amount, category, note: result.note.trim(), date };
}

export function validateReceiptImageBase64(value: unknown): value is string {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 2_000_000 &&
    value.length % 4 === 0 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
}
