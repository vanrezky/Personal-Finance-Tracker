import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Flame,
  Wallet,
  CalendarDays,
  TrendingUp,
  ReceiptText,
  Target,
} from 'lucide-react';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '../lib/utils';
import { Skeleton } from './Skeleton';
import type { TransactionRecord } from './financeTypes';

interface DashboardViewProps {
  balance: number;
  income: number;
  cycleIncome: number;
  cycleExpense: number;
  cycleStart: Date;
  cycleEnd: Date;
  elapsedDays: number;
  cycleLength: number;
  cycleProgress: number;
  payday: number;
  savingsRate: number;
  expenseRate: number;
  recentTransactionCount: number;
  totalTransactionCount: number;
  highlightMessage: string;
  remainingDays: number;
  averageDailyExpense: number;
  projectedCycleExpense: number;
  remainingSafeDays: number | null;
  spendingProgress: number;
  paceLabel: string;
  topExpenseCategories: Array<{ name: string; amount: number }>;
  latestTransactions: TransactionRecord[];
}

export function DashboardSkeleton() {
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
          <div className="space-y-3 rounded-3xl border border-emerald-100/50 bg-emerald-50 p-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full bg-emerald-100" />
              <Skeleton className="h-3 w-16 bg-emerald-100" />
            </div>
            <Skeleton className="h-6 w-24 bg-emerald-100" />
            <Skeleton className="h-3 w-20 bg-emerald-100" />
          </div>

          <div className="space-y-3 rounded-3xl border border-rose-100/50 bg-rose-50 p-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full bg-rose-100" />
              <Skeleton className="h-3 w-16 bg-rose-100" />
            </div>
            <Skeleton className="h-6 w-24 bg-rose-100" />
            <Skeleton className="h-3 w-20 bg-rose-100" />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}

export function DashboardView({
  balance,
  income,
  cycleIncome,
  cycleExpense,
  cycleStart,
  cycleEnd,
  elapsedDays,
  cycleLength,
  cycleProgress,
  payday,
  savingsRate,
  expenseRate,
  recentTransactionCount,
  totalTransactionCount,
  highlightMessage,
  remainingDays,
  averageDailyExpense,
  projectedCycleExpense,
  remainingSafeDays,
  spendingProgress,
  paceLabel,
  topExpenseCategories,
  latestTransactions,
}: DashboardViewProps) {
  const spendingPaceTone = spendingProgress <= cycleProgress ? 'text-emerald-700' : 'text-rose-700';

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
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">Progres</p>
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
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm shadow-slate-200/60 backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <CalendarDays className="h-4 w-4 text-indigo-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em]">Siklus</span>
          </div>
          <p className="text-sm font-semibold leading-5 text-slate-900">{format(cycleStart, 'dd MMM')} - {format(cycleEnd, 'dd MMM')}</p>
          <p className="mt-1 text-xs text-slate-500">Masih ada {remainingDays} hari sebelum hari gajian tanggal {payday}.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm shadow-slate-200/60 backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <Flame className="h-4 w-4 text-rose-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em]">Laju Belanja</span>
          </div>
          <p className="text-sm font-semibold leading-5 text-slate-900">{formatCurrency(averageDailyExpense)}/hari</p>
          <p className="mt-1 text-xs text-slate-500">Kalau polanya tetap sama, total belanja siklus ini sekitar {formatCurrency(projectedCycleExpense)}.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm shadow-slate-200/60 backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <Wallet className="h-4 w-4 text-emerald-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em]">Daya Tahan</span>
          </div>
          <p className="text-sm font-semibold leading-5 text-slate-900">
            {remainingSafeDays === null ? 'Belum terbaca' : `${remainingSafeDays} hari`}
          </p>
          <p className="mt-1 text-xs text-slate-500">Perkiraan saldo bisa bertahan kalau pola belanjanya tetap sama.</p>
        </div>
      </motion.div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <CalendarDays className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm">Ringkasan Siklus Ini</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:tracking-[0.2em]">
            {recentTransactionCount} transaksi
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 sm:gap-4">
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-[24px] border border-indigo-100/80 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm shadow-indigo-100/70 sm:rounded-[28px] sm:p-5"
          >
            <div className="mb-3 flex items-center gap-2 text-indigo-700">
              <div className="rounded-full bg-indigo-100 p-2">
                <Target className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] sm:text-xs sm:tracking-[0.18em]">Laju Pengeluaran</span>
            </div>
            <p className="text-lg font-bold text-indigo-950">{Math.round(spendingProgress)}%</p>
            <p className={`mt-2 text-xs font-medium leading-5 ${spendingPaceTone}`}>
              {paceLabel}
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
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-500 sm:tracking-[0.2em]">Insight utama</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">Hal yang paling perlu kamu lihat</h3>
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
              <p className="text-sm font-semibold text-slate-900">Kondisi saldo sampai gajian</p>
              <p className="text-sm text-slate-600">{highlightMessage}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Pos pengeluaran terbesar</p>
              {topExpenseCategories.length > 0 ? (
                <div className="space-y-1 text-sm text-slate-600">
                  {topExpenseCategories.map((category, index) => (
                    <div key={category.name} className="flex items-center justify-between gap-3">
                      <span className="truncate">{index + 1}. {category.name}</span>
                      <span className="shrink-0 font-semibold text-slate-900">{formatCurrency(category.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">Belum ada kategori pengeluaran pada siklus ini.</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <ReceiptText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Aktivitas selama siklus ini</p>
              <p className="text-sm text-slate-600">
                Ada <span className="font-semibold text-slate-900">{recentTransactionCount} transaksi</span> pada siklus ini dari total{' '}
                <span className="font-semibold text-slate-900">{totalTransactionCount}</span> transaksi yang tercatat.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 sm:rounded-[28px] sm:p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 sm:tracking-[0.2em]">Aktivitas terbaru</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">Transaksi terbaru</h3>
          </div>
          <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">
            <Clock3 className="h-5 w-5" />
          </div>
        </div>

        <div className="space-y-3">
          {latestTransactions.length > 0 ? latestTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{transaction.category}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {format(parseISO(transaction.date), 'dd MMM yyyy')}
                  {transaction.authorName ? ` • ${transaction.authorName}` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-bold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </p>
                <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-400">
                  <ArrowRight className="h-3 w-3" />
                  {transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                </p>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Belum ada transaksi terbaru yang bisa ditampilkan.
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:tracking-[0.2em]">Saldo total</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{formatCurrency(balance)}</p>
          <p className="mt-1 text-xs text-slate-500">Akumulasi semua pemasukan & pengeluaran.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:tracking-[0.2em]">Pemasukan total</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{formatCurrency(income)}</p>
          <p className="mt-1 text-xs text-slate-500">Total pemasukan yang sudah berhasil dicatat.</p>
        </div>
      </div>
    </div>
  );
}
