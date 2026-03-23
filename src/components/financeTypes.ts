export type TransactionType = 'income' | 'expense';

export interface TransactionRecord {
  id: string;
  householdId?: string;
  type: TransactionType;
  amount: number;
  category: string;
  note?: string;
  date: string;
  createdAt?: string;
  authorUid?: string;
  authorName?: string;
  receiptImage?: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  type: TransactionType;
  createdAt?: string;
  authorUid?: string;
}

export interface MonthlyExpenseItem {
  monthKey: string;
  monthLabel: string;
  totalExpense: number;
  percentageOfPeriodExpense: number;
  transactionCount: number;
}

export interface CategoryExpenseDatum {
  name: string;
  value: number;
}

export interface DailyTrendDatum {
  date: string;
  rawDate: Date;
  income: number;
  expense: number;
}
