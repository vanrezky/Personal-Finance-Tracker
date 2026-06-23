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

export interface ShoppingItemRecord {
  id: string;
  name: string;
  estimatedAmount: number;
  quantity?: number;
  unit?: string;
  notes?: string;
  isChecked?: boolean;
  checkedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  authorUid?: string;
  lastTransactionId?: string;
  lastImportedAt?: string;
}

export interface ShoppingAIInsight {
  householdId: string;
  monthKey: string;
  generatedAt: string;
  sourceRange: {
    from: string;
    to: string;
  };
  totals: {
    weeklyTotal: number;
    monthlyTotal: number;
    combinedTotal: number;
    previousCombinedTotal: number;
    changePercent: number;
  };
  topItems: Array<{
    normalizedName: string;
    sourceNames: string[];
    frequency: number;
    totalAmount: number;
    sourceCategory: '03' | '04' | 'both';
  }>;
  recommendations: Array<{
    normalizedName: string;
    displayName: string;
    reason: string;
    estimatedAmount: number;
    priority: 'high' | 'medium' | 'low';
    sourceNames: string[];
  }>;
  rejectedNames: string[];
}

export interface ShoppingAIReview {
  insightId: string;
  normalizedName: string;
  accepted: boolean;
  rejectedReason?: string;
  createdAt: string;
}

export type AnalysisStatus = 'idle' | 'loading' | 'analyzing' | 'success' | 'error' | 'empty';
