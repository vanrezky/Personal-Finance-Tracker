import { useEffect, useMemo, useState } from 'react';
import { endOfDay, format, isWithinInterval, parseISO, startOfDay, subMonths } from 'date-fns';
import { db, collection, query, onSnapshot } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { ReportsSkeleton, ReportsView } from './ReportsView';
import type { CategoryExpenseDatum, DailyTrendDatum, MonthlyExpenseItem, TransactionRecord } from './financeTypes';

export function Reports({ householdId }: { householdId: string }) {
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = `households/${householdId}/transactions`;
    const q = query(collection(db, path));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<TransactionRecord, 'id'>),
        }));
        setTransactions(data);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [householdId]);

  const viewModel = useMemo(() => {
    const filteredTransactions = transactions.filter((transaction) => {
      const transactionDate = parseISO(transaction.date);
      return isWithinInterval(transactionDate, {
        start: startOfDay(parseISO(startDate)),
        end: endOfDay(parseISO(endDate)),
      });
    });

    const { totalIncome, totalExpense } = filteredTransactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'income') acc.totalIncome += transaction.amount;
        else acc.totalExpense += transaction.amount;
        return acc;
      },
      { totalIncome: 0, totalExpense: 0 }
    );

    const expenseTransactions = filteredTransactions.filter((transaction) => transaction.type === 'expense');

    const monthlyExpenseData = Object.values(
      expenseTransactions.reduce<Record<string, Omit<MonthlyExpenseItem, 'percentageOfPeriodExpense'>>>((acc, transaction) => {
        const monthDate = parseISO(transaction.date);
        const monthKey = format(monthDate, 'yyyy-MM');

        if (!acc[monthKey]) {
          acc[monthKey] = {
            monthKey,
            monthLabel: format(monthDate, 'MMM yyyy'),
            totalExpense: 0,
            transactionCount: 0,
          };
        }

        acc[monthKey].totalExpense += transaction.amount;
        acc[monthKey].transactionCount += 1;
        return acc;
      }, {})
    )
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((item) => ({
        ...item,
        percentageOfPeriodExpense: totalExpense > 0 ? (item.totalExpense / totalExpense) * 100 : 0,
      }));

    const highestExpenseMonth = monthlyExpenseData.reduce<MonthlyExpenseItem | null>((highest, item) => {
      if (!highest || item.totalExpense > highest.totalExpense) {
        return item;
      }
      return highest;
    }, null);

    const averageMonthlyExpense = monthlyExpenseData.length > 0 ? totalExpense / monthlyExpenseData.length : 0;
    const latestMonth = monthlyExpenseData[monthlyExpenseData.length - 1];
    const previousMonth = monthlyExpenseData[monthlyExpenseData.length - 2];
    const latestMonthDelta = latestMonth && previousMonth ? latestMonth.totalExpense - previousMonth.totalExpense : null;
    const latestMonthDeltaLabel = latestMonthDelta === null
      ? 'Belum ada pembanding bulan sebelumnya.'
      : latestMonthDelta === 0
        ? `Stabil dibanding ${previousMonth?.monthLabel}.`
        : `${latestMonthDelta > 0 ? '+' : '-'}Rp${new Intl.NumberFormat('id-ID').format(Math.abs(latestMonthDelta))} vs ${previousMonth?.monthLabel}`;

    const categoryData = expenseTransactions
      .reduce<CategoryExpenseDatum[]>((acc, transaction) => {
        const existing = acc.find((item) => item.name === transaction.category);
        if (existing) {
          existing.value += transaction.amount;
        } else {
          acc.push({ name: transaction.category, value: transaction.amount });
        }
        return acc;
      }, [])
      .sort((a, b) => b.value - a.value);

    const dailyData = filteredTransactions
      .reduce<DailyTrendDatum[]>((acc, transaction) => {
        const rawDate = parseISO(transaction.date);
        const dateLabel = format(rawDate, 'dd MMM');
        const existing = acc.find((item) => item.date === dateLabel);

        if (existing) {
          if (transaction.type === 'income') existing.income += transaction.amount;
          else existing.expense += transaction.amount;
        } else {
          acc.push({
            date: dateLabel,
            rawDate,
            income: transaction.type === 'income' ? transaction.amount : 0,
            expense: transaction.type === 'expense' ? transaction.amount : 0,
          });
        }

        return acc;
      }, [])
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    return {
      totalIncome,
      totalExpense,
      monthlyExpenseData,
      highestExpenseMonth,
      averageMonthlyExpense,
      latestMonthLabel: latestMonth?.monthLabel,
      latestMonthDelta,
      latestMonthDeltaLabel,
      categoryData,
      dailyData,
    };
  }, [endDate, startDate, transactions]);

  if (loading) {
    return <ReportsSkeleton />;
  }

  return (
    <ReportsView
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      {...viewModel}
    />
  );
}
