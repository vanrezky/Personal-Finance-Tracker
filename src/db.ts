import Dexie, { type Table } from 'dexie';

export interface Transaction {
  id?: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
  date: string; // ISO string
  synced: number; // 0 for false, 1 for true
}

export class FinanceDatabase extends Dexie {
  transactions!: Table<Transaction, number>;

  constructor() {
    super('FinanceDatabase');
    this.version(1).stores({
      transactions: '++id, type, date, synced'
    });
  }
}

export const db = new FinanceDatabase();
