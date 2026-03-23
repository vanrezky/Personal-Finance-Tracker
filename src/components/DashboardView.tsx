import { ArrowDownRight, ArrowUpRight, CalendarDays, Sparkles, Target, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { formatCurrency } from '../lib/utils';
import { Skeleton } from './Skeleton';

interface DashboardViewProps {
  balance: number;
  income: number;
  cycleIncome: number;
  cycleExpense: number;
  cycleBalance: number;
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
}

function SmallMetric({ title, value, description, tone }: { title: string; value: string; description: string; tone: 'income' | 'expense' }) {
  const isIncome = tone === 'income';
  const Icon = isIncome ? ArrowDownRight : ArrowUpRight;

  return (
    <div className={isIncome ? 'rounded-[26px] border border-emerald-100 bg-white/90 p-4 shadow-sm' : 'rounded-[26px] border border-rose-100 bg-white/90 p-4 shadow-sm'}>
      <div className="mb-3 flex items-center gap-2">
        <div className={isIncome ? 'rounded-2xl bg-emerald-100 p-2 text-emerald-700' : 'rounded-2xl bg-rose-100 p-2 text-rose-700'}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</span>
      </div>
      <p className="text-xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-48 w-full rounded-[32px]" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-36 rounded-[28px]" />
        <Skeleton className="h-36 rounded-[28px]" />
      </div>
      <Skeleton className="h-72 w-full rounded-[32px]" />
    </div>
  );
}

export function DashboardView({
  balance,
  income,
  cycleIncome,
  cycleExpense,
  cycleBalance,
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
}: DashboardViewProps) {
  const spendingShare = cycleIncome > 0 ? `${expenseRate}% dari pemasukan siklus ini` : 'Belum ada pemasukan pembanding';
  const savingShare = cycleIncome > 0 ? `${Math.max(savingsRate, 0)}% potensi saldo tersisa` : 'Mulai catat pemasukan pertamamu';

  return (
    <div className="space-y-5 pb-8">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-indigo-500 via-indigo-500 to-violet-500 p-5 text-white shadow-[0_24px_70px_rgba(99,102,241,0.32)]"
      >
        <div className="absolute -right-8 top-3 rounded-full bg-white/10 p-8">
          <Wallet className="h-20 w-20" />
        </div>
        <div className="relative z-10 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/80">Saldo total</p>
              <h2 className="mt-2 text-[2.25rem] font-bold tracking-tight">{formatCurrency(balance)}</h2>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">
              Hari {elapsedDays}/{cycleLength}
            </span>
          </div>

          <p className="max-w-[24rem] text-sm leading-6 text-white/85">{highlightMessage}</p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-white/80">
              <span>Progres siklus berjalan</span>
              <span>{Math.round(cycleProgress)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gradient-to-r from-pink-300 via-amber-200 to-white transition-all duration-500" style={{ width: `${cycleProgress}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-[26px] bg-white/10 p-3 backdrop-blur-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Siklus aktif</p>
              <p className="mt-1 text-sm font-semibold">{format(cycleStart, 'dd MMM')} - {format(cycleEnd, 'dd MMM')}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Payday</p>
              <p className="mt-1 text-sm font-semibold">Tanggal {payday}</p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-4">
        <SmallMetric title="Pemasukan" value={formatCurrency(cycleIncome)} description={savingShare} tone="income" />
        <SmallMetric title="Pengeluaran" value={formatCurrency(cycleExpense)} description={spendingShare} tone="expense" />
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(148,163,184,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-400">Statistic</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Ringkasan yang penting dulu</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Sesuai arahan desain, bagian ini dibuat lebih ringkas supaya kamu langsung paham kondisi cashflow.</p>
          </div>
          <div className="rounded-[20px] bg-indigo-50 p-3 text-indigo-600">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
            <span className="font-medium">Net flow siklus ini</span>
            <span className={cycleBalance >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-500'}>
              {cycleBalance >= 0 ? 'Surplus' : 'Defisit'}
            </span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900">{formatCurrency(cycleBalance)}</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-300 via-indigo-400 to-pink-400" style={{ width: `${Math.max(Math.min(cycleProgress, 100), 10)}%` }} />
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="flex items-center justify-between rounded-[24px] bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-2.5 text-amber-600">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Transaksi siklus ini</p>
                <p className="text-xs text-slate-500">Fokus ke aktivitas paling baru</p>
              </div>
            </div>
            <span className="text-lg font-bold text-slate-900">{recentTransactionCount}</span>
          </div>

          <div className="flex items-center justify-between rounded-[24px] bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-2.5 text-sky-600">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Semua catatan tersimpan</p>
                <p className="text-xs text-slate-500">Termasuk pemasukan dan pengeluaran lama</p>
              </div>
            </div>
            <span className="text-lg font-bold text-slate-900">{totalTransactionCount}</span>
          </div>

          <div className="rounded-[24px] bg-gradient-to-r from-pink-50 via-white to-amber-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">Pemasukan total sepanjang waktu</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(income)}</p>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
