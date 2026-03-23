import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, doc, getDoc } from '../firebase';
import { formatCurrency } from '../lib/utils';
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  CalendarDays,
  Sparkles,
  TrendingUp,
  ReceiptText,
} from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import {
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  setDate,
  subMonths,
  addMonths,
  format,
  differenceInCalendarDays,
} from 'date-fns';
import { Skeleton } from './Skeleton';

type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category?: string;
};

export function Dashboard({ householdId }: { householdId: string }) {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
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
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Transaction, 'id'>),
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

  const now = new Date();
  let cycleStart: Date;
  let cycleEnd: Date;

  if (now.getDate() >= payday) {
    cycleStart = startOfDay(setDate(now, payday));
    cycleEnd = endOfDay(setDate(addMonths(now, 1), payday - 1));
  } else {
    cycleStart = startOfDay(setDate(subMonths(now, 1), payday));
    cycleEnd = endOfDay(setDate(now, payday - 1));
  }

  const cycleTransactions = (transactions || []).filter((transaction) => {
    const transactionDate = parseISO(transaction.date);
    return isWithinInterval(transactionDate, { start: cycleStart, end: cycleEnd });
  });

  const { income, expense, balance } = (transactions || []).reduce(
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

  const { cycleIncome, cycleExpense } = cycleTransactions.reduce(
    (acc, current) => {
      if (current.type === 'income') acc.cycleIncome += current.amount;
      else acc.cycleExpense += current.amount;
      return acc;
    },
    { cycleIncome: 0, cycleExpense: 0 }
  );

  const cycleBalance = cycleIncome - cycleExpense;
  const cycleLength = differenceInCalendarDays(cycleEnd, cycleStart) + 1;
  const elapsedDays = Math.min(differenceInCalendarDays(now, cycleStart) + 1, cycleLength);
  const cycleProgress = Math.min(Math.max((elapsedDays / cycleLength) * 100, 0), 100);
  const savingsRate = cycleIncome > 0 ? Math.round((cycleBalance / cycleIncome) * 100) : 0;
  const expenseRate = cycleIncome > 0 ? Math.round((cycleExpense / cycleIncome) * 100) : 0;
  const recentTransactionCount = cycleTransactions.length;
  const highlightMessage =
    cycleIncome === 0 && cycleExpense === 0
      ? 'Belum ada transaksi pada siklus ini. Yuk mulai catat arus kas pertamamu.'
      : cycleBalance >= 0
        ? `Cashflow aman. Masih tersisa ${formatCurrency(cycleBalance)} di siklus berjalan.`
        : `Pengeluaran melebihi pemasukan sebesar ${formatCurrency(Math.abs(cycleBalance))}.`;

  if (!transactions) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <div className="relative overflow-hidden rounded-[24px] bg-slate-900 p-5 shadow-xl sm:rounded-[28px] sm:p-6">
          <div className="relative z-10 space-y-3">
            <Skeleton className="h-4 w-24 bg-slate-700" />
            <Skeleton className="h-10 w-48 bg-slate-700" />
            <Skeleton className="h-3 w-40 bg-slate-700" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-10 rounded-2xl" />
          <Skeleton className="h-10 rounded-2xl" />
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100/50 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full bg-emerald-100" />
                <Skeleton className="h-3 w-16 bg-emerald-100" />
              </div>
              <Skeleton className="h-6 w-24 bg-emerald-100" />
              <Skeleton className="h-3 w-20 bg-emerald-100" />
            </div>

            <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100/50 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full bg-rose-100" />
                <Skeleton className="h-3 w-16 bg-rose-100" />
              </div>
              <Skeleton className="h-6 w-24 bg-rose-100" />
              <Skeleton className="h-3 w-20 bg-rose-100" />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm space-y-4 sm:rounded-[28px] sm:p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.24)] sm:rounded-[32px] sm:p-6"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_28%)]" />
        <div className="absolute -right-3 top-0 p-8 opacity-[0.12]">
          <Wallet className="h-24 w-24 sm:h-32 sm:w-32" />
        </div>

        <div className="relative z-10 space-y-4 sm:space-y-5">
          <div className="space-y-3 sm:flex sm:items-start sm:justify-between sm:gap-4 sm:space-y-0">
            <div className="min-w-0">
              <p className="mb-1 text-sm font-medium text-slate-300">Total Saldo</p>
              <h2 className="text-[2rem] font-semibold tracking-tight sm:text-[2.75rem]">
                {formatCurrency(balance)}
              </h2>
            </div>

            <div className="hidden rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-right backdrop-blur-sm sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">Progress</p>
              <p className="text-sm font-semibold text-white">Hari {elapsedDays} / {cycleLength}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200 sm:hidden">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">Progress siklus</p>
              <p className="mt-1 text-sm font-semibold text-white">Hari {elapsedDays} dari {cycleLength}</p>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">{Math.round(cycleProgress)}%</span>
          </div>

          <p className="max-w-md text-sm leading-6 text-slate-300 sm:pr-10">{highlightMessage}</p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Siklus berjalan</span>
              <span>{Math.round(cycleProgress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-400 transition-all duration-500"
                style={{ width: `${cycleProgress}%` }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm shadow-slate-200/60 backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <CalendarDays className="h-4 w-4 text-indigo-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em]">Siklus aktif</span>
          </div>
          <p className="text-sm font-semibold leading-5 text-slate-900">{format(cycleStart, 'dd MMM')} - {format(cycleEnd, 'dd MMM')}</p>
          <p className="mt-1 text-xs text-slate-500">Periode gajian bulan ini.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm shadow-slate-200/60 backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em]">Payday</span>
          </div>
          <p className="text-sm font-semibold leading-5 text-slate-900">Tanggal {payday} tiap bulan</p>
          <p className="mt-1 text-xs text-slate-500">Biar cashflow lebih gampang dipantau.</p>
        </div>
      </motion.div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm">Ringkasan Siklus Ini</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.2em] text-slate-500">
            {recentTransactionCount} transaksi
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[24px] border border-emerald-100/80 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm shadow-emerald-100/70 sm:rounded-[28px] sm:p-5"
          >
            <div className="mb-3 flex items-center gap-2 text-emerald-700">
              <div className="rounded-full bg-emerald-100 p-2">
                <ArrowDownRight className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] sm:text-xs sm:tracking-[0.18em]">Pemasukan</span>
            </div>
            <p className="break-words text-lg font-bold text-emerald-950">{formatCurrency(cycleIncome)}</p>
            <p className="mt-2 max-w-[18ch] text-xs font-medium leading-5 text-emerald-700/80 sm:max-w-none">
              {cycleIncome > 0 ? `${Math.max(savingsRate, 0)}% potensi sisa saldo` : 'Belum ada pemasukan tercatat'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-[24px] border border-rose-100/80 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm shadow-rose-100/70 sm:rounded-[28px] sm:p-5"
          >
            <div className="mb-3 flex items-center gap-2 text-rose-700">
              <div className="rounded-full bg-rose-100 p-2">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] sm:text-xs sm:tracking-[0.18em]">Pengeluaran</span>
            </div>
            <p className="break-words text-lg font-bold text-rose-950">{formatCurrency(cycleExpense)}</p>
            <p className="mt-2 max-w-[18ch] text-xs font-medium leading-5 text-rose-700/80 sm:max-w-none">
              {cycleIncome > 0 ? `${expenseRate}% dari total pemasukan` : 'Belum ada pengeluaran tercatat'}
            </p>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 sm:rounded-[28px] sm:p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-500 sm:tracking-[0.2em]">Quick insight</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">Sorotan keuangan kamu</h3>
          </div>
          <div className="shrink-0 rounded-2xl bg-indigo-50 p-2 text-indigo-600">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Net flow siklus ini</p>
              <p className="text-sm text-slate-600">
                {cycleBalance >= 0 ? 'Masih surplus' : 'Sedang defisit'} sebesar{' '}
                <span className="font-semibold text-slate-900">{formatCurrency(Math.abs(cycleBalance))}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <ReceiptText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Aktivitas transaksi</p>
              <p className="text-sm text-slate-600">
                Ada <span className="font-semibold text-slate-900">{recentTransactionCount} transaksi</span> pada siklus ini dari total{' '}
                <span className="font-semibold text-slate-900">{transactions.length}</span> transaksi yang tercatat.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em] text-slate-500">Saldo total</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{formatCurrency(balance)}</p>
          <p className="mt-1 text-xs text-slate-500">Akumulasi semua pemasukan & pengeluaran.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em] text-slate-500">Pemasukan total</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{formatCurrency(income)}</p>
          <p className="mt-1 text-xs text-slate-500">Total pemasukan yang sudah berhasil dicatat.</p>
        </div>
      </div>
    </div>
  );
}
