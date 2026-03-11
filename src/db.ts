import Dexie, { type Table } from 'dexie';

export interface Transaction {
  id?: number;
  syncId: string; // Global UUID for syncing
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
  date: string; // ISO string
  synced: number; // 0 for false, 1 for true
  syncAction?: 'create' | 'update' | 'delete' | null;
}

export class FinanceDatabase extends Dexie {
  transactions!: Table<Transaction, number>;

  constructor() {
    super('FinanceDatabase');
    this.version(2).stores({
      transactions: '++id, syncId, type, date, synced, syncAction'
    });
  }
}

export const db = new FinanceDatabase();
