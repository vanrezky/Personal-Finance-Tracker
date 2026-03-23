import { useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  isWithinInterval,
  parseISO,
  setDate,
  startOfDay,
  subMonths,
} from 'date-fns';
import { db, collection, onSnapshot, query, doc, getDoc } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { DashboardSkeleton, DashboardView } from './DashboardView';
import type { TransactionRecord } from './financeTypes';

export function Dashboard({ householdId }: { householdId: string }) {
  const [transactions, setTransactions] = useState<TransactionRecord[] | null>(null);
  const [payday, setPayday] = useState<number>(25);

  useEffect(() => {
    const householdPath = `households/${householdId}`;
    getDoc(doc(db, householdPath)).then((snap) => {
      if (snap.exists() && snap.data().payday) {
        setPayday(snap.data().payday);
      }
    });

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
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        setTransactions([]);
      }
    );

    return () => unsubscribe();
  }, [householdId]);

  const viewModel = useMemo(() => {
    const items = transactions ?? [];
    const now = new Date();

    const cycleStart = now.getDate() >= payday
      ? startOfDay(setDate(now, payday))
      : startOfDay(setDate(subMonths(now, 1), payday));

    const cycleEnd = now.getDate() >= payday
      ? endOfDay(setDate(addMonths(now, 1), payday - 1))
      : endOfDay(setDate(now, payday - 1));

    const cycleTransactions = items.filter((transaction) => {
      const transactionDate = parseISO(transaction.date);
      return isWithinInterval(transactionDate, { start: cycleStart, end: cycleEnd });
    });

    const totals = items.reduce(
      (acc, current) => {
        if (current.type === 'income') {
          acc.income += current.amount;
          acc.balance += current.amount;
        } else {
          acc.expense += current.amount;
          acc.balance -= current.amount;
        }
        return acc;
      },
      { income: 0, expense: 0, balance: 0 }
    );

    const cycleTotals = cycleTransactions.reduce(
      (acc, current) => {
        if (current.type === 'income') acc.cycleIncome += current.amount;
        else acc.cycleExpense += current.amount;
        return acc;
      },
      { cycleIncome: 0, cycleExpense: 0 }
    );

    const cycleBalance = cycleTotals.cycleIncome - cycleTotals.cycleExpense;
    const cycleLength = differenceInCalendarDays(cycleEnd, cycleStart) + 1;
    const elapsedDays = Math.min(differenceInCalendarDays(now, cycleStart) + 1, cycleLength);
    const cycleProgress = Math.min(Math.max((elapsedDays / cycleLength) * 100, 0), 100);
    const savingsRate = cycleTotals.cycleIncome > 0 ? Math.round((cycleBalance / cycleTotals.cycleIncome) * 100) : 0;
    const expenseRate = cycleTotals.cycleIncome > 0 ? Math.round((cycleTotals.cycleExpense / cycleTotals.cycleIncome) * 100) : 0;
    const recentTransactionCount = cycleTransactions.length;

    const highlightMessage = cycleTotals.cycleIncome === 0 && cycleTotals.cycleExpense === 0
      ? 'Belum ada transaksi pada siklus ini. Yuk mulai catat arus kas pertamamu.'
      : cycleBalance >= 0
        ? `Cashflow aman. Masih tersisa Rp${new Intl.NumberFormat('id-ID').format(cycleBalance)} di siklus berjalan.`
        : `Pengeluaran melebihi pemasukan sebesar Rp${new Intl.NumberFormat('id-ID').format(Math.abs(cycleBalance))}.`;

    return {
      ...totals,
      ...cycleTotals,
      cycleBalance,
      cycleStart,
      cycleEnd,
      cycleLength,
      elapsedDays,
      cycleProgress,
      savingsRate,
      expenseRate,
      recentTransactionCount,
      totalTransactionCount: items.length,
      highlightMessage,
    };
  }, [payday, transactions]);

  if (!transactions) {
    return <DashboardSkeleton />;
  }

  return <DashboardView payday={payday} {...viewModel} />;
}
