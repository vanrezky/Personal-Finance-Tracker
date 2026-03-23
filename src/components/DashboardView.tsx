import { motion } from 'motion/react';
import { CalendarDays, Sparkles, TrendingDown, TrendingUp, Wallet2 } from 'lucide-react';
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

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-56 w-full rounded-[1.9rem]" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-32 rounded-[1.5rem]" />
        <Skeleton className="h-32 rounded-[1.5rem]" />
      </div>
      <Skeleton className="h-48 w-full rounded-[1.8rem]" />
      <Skeleton className="h-40 w-full rounded-[1.8rem]" />
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  tone: 'income' | 'expense';
}) {
  const Icon = tone === 'income' ? TrendingUp : TrendingDown;
  const toneClasses = tone === 'income'
    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
    : 'bg-rose-50 text-rose-500 border-rose-100';

  return (
    <div className="moni-card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--moni-subtle)]">{title}</p>
          <p className="mt-3 text-xl font-semibold tracking-tight text-[color:var(--moni-text)]">{value}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--moni-subtle)]">{description}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-[1rem] border ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
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
  return (
    <div className="space-y-5 pb-6">
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="moni-card relative overflow-hidden p-5 text-white sm:p-6">
        <div className="moni-hero absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,207,111,0.22),transparent_28%)]" />
        <div className="absolute -right-2 top-3 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/80">Saldo bersih saat ini</p>
              <h2 className="mt-2 text-[2.35rem] font-semibold tracking-tight sm:text-[2.75rem]">{formatCurrency(balance)}</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/80">{highlightMessage}</p>
            </div>
            <div className="hidden h-14 w-14 items-center justify-center rounded-[1.3rem] bg-white/15 backdrop-blur sm:flex">
              <Wallet2 className="h-7 w-7" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1.3fr_0.8fr]">
            <div className="rounded-[1.5rem] border border-white/20 bg-white/12 p-4 backdrop-blur">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                <span>Progress menuju payday</span>
                <span>{Math.round(cycleProgress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-gradient-to-r from-[#ffe081] via-[#ffb4d9] to-white" style={{ width: `${cycleProgress}%` }} />
              </div>
              <p className="mt-3 text-sm text-white/80">Hari {elapsedDays} dari {cycleLength} pada siklus aktif.</p>
            </div>

            <div className="rounded-[1.5rem] border border-white/20 bg-white/12 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">Payday</p>
              <p className="mt-2 text-lg font-semibold">Tanggal {payday}</p>
              <p className="mt-1 text-sm text-white/80">Siklus {format(cycleStart, 'dd MMM')} — {format(cycleEnd, 'dd MMM')}</p>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard title="Pemasukan siklus ini" value={formatCurrency(cycleIncome)} description={cycleIncome > 0 ? `${Math.max(savingsRate, 0)}% potensi sisa saldo jika ritme tetap terjaga.` : 'Belum ada pemasukan tercatat pada siklus ini.'} tone="income" />
        <MetricCard title="Pengeluaran siklus ini" value={formatCurrency(cycleExpense)} description={cycleIncome > 0 ? `${expenseRate}% dari pemasukan aktif sudah terpakai.` : 'Belum ada pengeluaran yang masuk pada siklus ini.'} tone="expense" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="moni-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">Insight ringkas</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-[color:var(--moni-text)]">Yang penting dipahami hari ini</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#fff1f8] text-fuchsia-500">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[1.35rem] bg-[#f7f4ff] p-4">
              <p className="text-sm font-semibold text-[color:var(--moni-text)]">Sisa cashflow aktif</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--moni-text)]">{formatCurrency(cycleBalance)}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--moni-subtle)]">{cycleBalance >= 0 ? 'Masih aman. Kamu masih punya ruang sampai payday berikutnya.' : 'Sudah melewati batas aman. Saatnya cek kategori yang paling boros.'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.3rem] bg-[#fff8ee] p-4">
                <div className="flex items-center gap-2 text-amber-500">
                  <CalendarDays className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Transaksi aktif</p>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--moni-text)]">{recentTransactionCount}</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--moni-subtle)]">Transaksi pada siklus berjalan.</p>
              </div>

              <div className="rounded-[1.3rem] bg-[#f4fbff] p-4">
                <div className="flex items-center gap-2 text-sky-500">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Semua catatan</p>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--moni-text)]">{totalTransactionCount}</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--moni-subtle)]">Jumlah transaksi yang sudah terekam sejauh ini.</p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="moni-card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">Snapshot cepat</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-[color:var(--moni-text)]">Supaya nggak tenggelam di angka</h3>

          <div className="mt-5 space-y-3">
            <div className="rounded-[1.3rem] border border-white/70 bg-[#f9f7ff] p-4">
              <p className="text-sm text-[color:var(--moni-subtle)]">Saldo total sepanjang waktu</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--moni-text)]">{formatCurrency(balance)}</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/70 bg-[#fff1f8] p-4">
              <p className="text-sm text-[color:var(--moni-subtle)]">Total pemasukan tercatat</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--moni-text)]">{formatCurrency(income)}</p>
            </div>
            <p className="rounded-[1.3rem] bg-[#f7f4ff] px-4 py-3 text-sm leading-6 text-[color:var(--moni-subtle)]">
              Fokus utamanya cukup tiga hal: saldo sekarang, pengeluaran bulan ini, dan sisa menuju payday. Sisanya biarkan di halaman laporan.
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
