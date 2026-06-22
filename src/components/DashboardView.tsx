import { useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Eye,
  EyeOff,
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
  userName: string;
  savingsRate: number;
  expenseRate: number;
  recentTransactionCount: number;
  totalTransactionCount: number;
  remainingDays: number;
  averageDailyExpense: number;
  projectedCycleExpense: number;
  remainingSafeDays: number | null;
  spendingProgress: number;
  topExpenseCategories: Array<{ name: string; amount: number }>;
  latestTransactions: TransactionRecord[];
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="px-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-2 h-3 w-24" />
      </div>

      <div className="relative overflow-hidden rounded-[28px] bg-slate-900 p-5 shadow-xl">
        <div className="relative z-10 space-y-3">
          <Skeleton className="h-4 w-24 bg-slate-700" />
          <Skeleton className="h-12 w-52 bg-slate-700" />
          <Skeleton className="h-3 w-40 bg-slate-700" />
          <Skeleton className="h-2 w-full bg-slate-700" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
      </div>

      <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
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
  remainingDays,
  averageDailyExpense,
  projectedCycleExpense,
  remainingSafeDays,
  spendingProgress,
  topExpenseCategories,
  latestTransactions,
  userName,
}: DashboardViewProps) {
  const [isBalanceRevealed, setIsBalanceRevealed] = useState(false);
  const maskedBalance = 'Rp••••••••••';
  const maskedCompactAmount = 'Rp••••••';
  const spendingPaceTone = spendingProgress <= cycleProgress ? 'text-emerald-700' : 'text-amber-700';
  const spendingPaceBg = spendingProgress <= cycleProgress ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700';
  const spendingPaceIconBg = spendingProgress <= cycleProgress ? 'bg-emerald-100' : 'bg-amber-100';

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const dateStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="space-y-5 pb-2">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 px-1"
      >
        <div>
          <p className="text-2xl font-bold tracking-tight text-slate-950">{greeting}, {userName}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">Siklus gaji tanggal {payday}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right shadow-sm shadow-slate-200/70">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Hari ini</p>
          <p className="mt-1 text-xs font-semibold text-slate-700">{dateStr}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#071426] via-[#10233f] to-[#4338ca] p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:p-6"
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(129,140,248,0.45),transparent_34%),radial-gradient(circle_at_18%_90%,rgba(16,185,129,0.28),transparent_30%)]" />
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-white/10" />
        <div className="absolute -right-2 top-12 h-24 w-24 rounded-full border border-white/5" />
        <div className="absolute -bottom-16 right-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <Wallet className="absolute right-6 top-6 h-8 w-8 text-white/20" />

        <div className="relative z-10 space-y-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-100">
              <span>Saldo tersedia</span>
              <button
                type="button"
                onClick={() => setIsBalanceRevealed((prev) => !prev)}
                className="rounded-full bg-white/10 p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                aria-label={isBalanceRevealed ? 'Sembunyikan saldo' : 'Tampilkan saldo'}
              >
                {isBalanceRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <h2 className="break-words text-[2.45rem] font-bold leading-none tracking-tight sm:text-[3.3rem]">
              {isBalanceRevealed ? formatCurrency(balance) : maskedBalance}
            </h2>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-indigo-100/85">
              <span>Siklus berjalan</span>
              <span>{Math.round(cycleProgress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-200 to-indigo-200 transition-all duration-500"
                style={{ width: `${cycleProgress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-indigo-100/65">
              <span>{format(cycleStart, 'dd MMM')}</span>
              <span>{elapsedDays}/{cycleLength} hari</span>
              <span>{format(cycleEnd, 'dd MMM')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-white/10 pt-4">
            <div className="pr-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-100/70">Pemasukan</p>
              <p className="mt-1 truncate text-sm font-bold text-white">
                {isBalanceRevealed ? formatCurrency(cycleIncome) : maskedCompactAmount}
              </p>
            </div>
            <div className="border-l border-white/10 pl-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-100/70">Pengeluaran</p>
              <p className="mt-1 truncate text-sm font-bold text-white">
                {isBalanceRevealed ? formatCurrency(cycleExpense) : maskedCompactAmount}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/70"
      >
        <div className="pr-4">
          <div className="mb-3 flex items-center gap-2 text-indigo-600">
            <Flame className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Laju</p>
          </div>
          <p className="mt-1 text-lg font-bold tracking-tight text-slate-950">{formatCurrency(averageDailyExpense)}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">per hari</p>
        </div>

        <div className="border-l border-slate-100 pl-4">
          <div className="mb-3 flex items-center gap-2 text-emerald-600">
            <Wallet className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Daya Tahan</p>
          </div>
          <p className="mt-1 text-lg font-bold tracking-tight text-slate-950">
            {remainingSafeDays === null ? '-' : remainingSafeDays}
            <span className="ml-1 text-sm font-semibold text-slate-500">hari</span>
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">{remainingDays} hari menuju gajian</p>
        </div>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-[26px] border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/70"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-500">Insight Hari Ini</p>
            <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-950">Kondisi keuangan cepat</h3>
          </div>
          <div className={`rounded-full p-2 ${spendingPaceBg}`}>
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div>
          <div className="flex items-start gap-3 pb-4">
            <div className={`mt-0.5 rounded-full p-2 ${spendingPaceIconBg} ${spendingPaceTone}`}>
              <Target className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950">Laju pengeluaran {Math.round(spendingProgress)}%</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">Dibandingkan dengan progres siklus {Math.round(cycleProgress)}%.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-slate-100 pt-4">
            <div className="pr-4">
              <div className="mb-2 flex items-center gap-1.5 text-emerald-700">
                <ArrowDownRight className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">Sisa potensi</span>
              </div>
              <p className="text-xl font-bold text-emerald-950">{cycleIncome > 0 ? `${Math.max(savingsRate, 0)}%` : '-'}</p>
              <p className="mt-1 text-xs text-emerald-700/80">dari pemasukan siklus</p>
            </div>

            <div className="border-l border-slate-100 pl-4">
              <div className="mb-2 flex items-center gap-1.5 text-amber-700">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">Rasio keluar</span>
              </div>
              <p className="text-xl font-bold text-amber-950">{cycleIncome > 0 ? `${expenseRate}%` : '-'}</p>
              <p className="mt-1 text-xs text-amber-700/80">terhadap pemasukan</p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-[26px] border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/70"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Kategori terbesar</p>
            <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-950">Spending breakdown</h3>
          </div>
          <div className="rounded-full bg-amber-50 p-2 text-amber-600">
            <Flame className="h-5 w-5" />
          </div>
        </div>

        {topExpenseCategories.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {topExpenseCategories.map((category, index) => {
              const maxAmount = topExpenseCategories[0]?.amount || 1;
              const width = Math.max((category.amount / maxAmount) * 100, 8);
              return (
                <div key={category.name} className="space-y-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-xs font-black text-slate-300">0{index + 1}</span>
                      <span className="truncate font-semibold text-slate-800">{category.name}</span>
                    </div>
                    <span className="shrink-0 font-bold text-slate-950">{formatCurrency(category.amount)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Belum ada kategori pengeluaran pada siklus ini.
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-[26px] border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/70"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Aktivitas terbaru</p>
            <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-950">Transaksi terakhir</h3>
          </div>
          <div className="rounded-full bg-slate-100 p-2 text-slate-600">
            <Clock3 className="h-5 w-5" />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {latestTransactions.length > 0 ? latestTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${transaction.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                  <ReceiptText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{transaction.category}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {format(parseISO(transaction.date), 'dd MMM yyyy')}
                    {transaction.authorName ? ` • ${transaction.authorName}` : ''}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-bold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-slate-950'}`}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
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

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid grid-cols-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/60"
      >
        <div className="pr-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Proyeksi</p>
          <p className="mt-2 text-base font-bold text-slate-950">{formatCurrency(projectedCycleExpense)}</p>
          <p className="mt-1 text-xs text-slate-500">estimasi belanja siklus</p>
        </div>

        <div className="border-l border-slate-100 pl-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Aktivitas</p>
          <p className="mt-2 text-base font-bold text-slate-950">{recentTransactionCount} / {totalTransactionCount}</p>
          <p className="mt-1 text-xs text-slate-500">transaksi siklus / total</p>
        </div>
      </motion.div>
    </div>
  );
}
