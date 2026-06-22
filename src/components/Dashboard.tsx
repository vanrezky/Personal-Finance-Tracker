import { useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  compareDesc,
  differenceInCalendarDays,
  endOfDay,
  isWithinInterval,
  parseISO,
  setDate,
  startOfDay,
  subMonths,
} from 'date-fns';
import { auth, db, collection, onSnapshot, query, doc, getDoc } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { DashboardSkeleton, DashboardView } from './DashboardView';
import type { TransactionRecord } from './financeTypes';

export function Dashboard({ householdId }: { householdId: string }) {
  const [transactions, setTransactions] = useState<TransactionRecord[] | null>(null);

  const userName = auth.currentUser?.displayName?.split(' ')[0]
    || auth.currentUser?.email?.split('@')[0]
    || 'Pengguna';
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

    const sortedTransactions = [...items].sort((left, right) => {
      const leftDate = left.createdAt ? parseISO(left.createdAt) : parseISO(left.date);
      const rightDate = right.createdAt ? parseISO(right.createdAt) : parseISO(right.date);
      return compareDesc(leftDate, rightDate);
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
    const remainingDays = Math.max(differenceInCalendarDays(cycleEnd, now), 0);
    const averageDailyExpense = elapsedDays > 0 ? cycleTotals.cycleExpense / elapsedDays : 0;
    const projectedCycleExpense = averageDailyExpense * cycleLength;
    const remainingSafeDays = averageDailyExpense > 0 ? Math.floor(Math.max(totals.balance, 0) / averageDailyExpense) : null;
    const spendingProgress = cycleTotals.cycleIncome > 0
      ? Math.min((cycleTotals.cycleExpense / cycleTotals.cycleIncome) * 100, 999)
      : 0;
    const paceDelta = Math.round(spendingProgress - cycleProgress);

    const topExpenseCategories = Object.entries(
      cycleTransactions.reduce<Record<string, number>>((accumulator, current) => {
        if (current.type !== 'expense') return accumulator;
        const key = current.category || 'Tanpa kategori';
        accumulator[key] = (accumulator[key] ?? 0) + current.amount;
        return accumulator;
      }, {})
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([name, amount]) => ({ name, amount }));

    const latestTransactions = sortedTransactions.slice(0, 3);

    const highlightMessage = cycleTotals.cycleIncome === 0 && cycleTotals.cycleExpense === 0
      ? 'Belum ada transaksi di siklus ini. Mulai dari satu catatan dulu biar ritme arus kas mulai kebaca.'
      : averageDailyExpense === 0
        ? `Belum ada pola pengeluaran yang kebaca. Masih ada ${remainingDays} hari sebelum hari gajian berikutnya.`
        : remainingSafeDays !== null && remainingSafeDays >= remainingDays
          ? `Ritme belanja masih aman. Kalau polanya begini terus, saldo diperkirakan cukup sampai hari gajian berikutnya dalam ${remainingDays} hari.`
          : `Belanja mulai agak ngebut. Kalau polanya tidak berubah, saldo diperkirakan bertahan sekitar ${Math.max(remainingSafeDays ?? 0, 0)} hari lagi.`;
    const paceLabel = cycleTotals.cycleIncome === 0
      ? 'Belum ada pemasukan di siklus ini, jadi laju pengeluaran belum bisa dibandingkan.'
      : cycleBalance >= 0
        ? paceDelta <= 0
          ? `Pengeluaran masih santai, sekitar ${Math.abs(paceDelta)}% lebih rendah dari laju waktu siklus.`
          : `Pengeluaran sudah ${paceDelta}% lebih cepat dibanding laju waktu siklus.`
        : `Pengeluaran sudah lebih besar dari pemasukan sebesar Rp${new Intl.NumberFormat('id-ID').format(Math.abs(cycleBalance))}.`;

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
      remainingDays,
      averageDailyExpense,
      projectedCycleExpense,
      remainingSafeDays,
      spendingProgress,
      paceLabel,
      topExpenseCategories,
      latestTransactions,
    };
  }, [payday, transactions]);

  if (!transactions) {
    return <DashboardSkeleton />;
  }

  return <DashboardView payday={payday} userName={userName} {...viewModel} />;
}
