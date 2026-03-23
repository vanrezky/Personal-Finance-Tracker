import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Calendar, PieChart as PieChartIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Skeleton } from './Skeleton';
import type { CategoryExpenseDatum, DailyTrendDatum, MonthlyExpenseItem } from './financeTypes';

const COLORS = ['#6f6df4', '#ef7cc2', '#ffbf66', '#65d4ff', '#83d39d', '#9b8cff', '#ff8a7d'];

interface ReportsViewProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  totalIncome: number;
  totalExpense: number;
  monthlyExpenseData: MonthlyExpenseItem[];
  highestExpenseMonth: MonthlyExpenseItem | null;
  averageMonthlyExpense: number;
  latestMonthLabel?: string;
  latestMonthDelta: number | null;
  latestMonthDeltaLabel: string;
  categoryData: CategoryExpenseDatum[];
  dailyData: DailyTrendDatum[];
}

export function ReportsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-40 w-full rounded-[1.8rem]" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-[1.5rem]" />
        <Skeleton className="h-28 rounded-[1.5rem]" />
      </div>
      <Skeleton className="h-72 w-full rounded-[1.8rem]" />
      <Skeleton className="h-80 w-full rounded-[1.8rem]" />
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-violet-100 bg-[#faf8ff] px-5 py-10 text-center">
      <p className="text-sm font-semibold text-[color:var(--moni-text)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--moni-subtle)]">{description}</p>
    </div>
  );
}

function SummaryCard({ title, value, tone }: { title: string; value: number; tone: 'income' | 'expense' }) {
  const isIncome = tone === 'income';
  return (
    <div className="moni-card-soft p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--moni-subtle)]">{title}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--moni-text)]">{formatCurrency(value)}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--moni-subtle)]">{isIncome ? 'Dana masuk pada periode aktif.' : 'Dana keluar pada periode aktif.'}</p>
        </div>
        <div className={isIncome ? 'flex h-11 w-11 items-center justify-center rounded-[1rem] bg-emerald-50 text-emerald-500' : 'flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#fff1f8] text-fuchsia-500'}>
          {isIncome ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
        </div>
      </div>
    </div>
  );
}

function SectionFrame({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="moni-card p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">Analitik</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-[color:var(--moni-text)]">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--moni-subtle)]">{subtitle}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#f7f4ff] text-violet-500">{icon}</div>
      </div>
      {children}
    </section>
  );
}

export function ReportsView({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  totalIncome,
  totalExpense,
  monthlyExpenseData,
  highestExpenseMonth,
  averageMonthlyExpense,
  latestMonthLabel,
  latestMonthDelta,
  latestMonthDeltaLabel,
  categoryData,
  dailyData,
}: ReportsViewProps) {
  return (
    <div className="space-y-5 pb-6">
      <section className="moni-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">Filter periode</p>
            <h2 className="mt-2 text-[1.9rem] font-semibold tracking-tight text-[color:var(--moni-text)]">Laporan yang lebih mudah dibaca</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[color:var(--moni-subtle)]">Pilih rentang tanggal, lalu fokus ke hal yang paling membantu: total masuk, total keluar, dan pola kategori belanja.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#f7f4ff] px-4 py-2 text-sm text-violet-500">
            <Calendar className="h-4 w-4" /> Rentang aktif
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Mulai</label>
            <input type="date" value={startDate} max={endDate} onChange={(event) => onStartDateChange(event.target.value)} className="moni-input" />
          </div>
          <div className="space-y-2">
            <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Selesai</label>
            <input type="date" value={endDate} min={startDate} onChange={(event) => onEndDateChange(event.target.value)} className="moni-input" />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard title="Pemasukan periode ini" value={totalIncome} tone="income" />
        <SummaryCard title="Pengeluaran periode ini" value={totalExpense} tone="expense" />
      </div>

      <SectionFrame title="Pergerakan pengeluaran bulanan" subtitle="Lihat bulan yang paling boros, rata-rata bulanan, dan pergeseran bulan terakhir tanpa harus membaca terlalu banyak kartu kecil." icon={<TrendingDown className="h-5 w-5" />}>
        {monthlyExpenseData.length > 0 ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.35rem] bg-[#f7f4ff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--moni-subtle)]">Bulan tertinggi</p>
                <p className="mt-3 text-lg font-semibold tracking-tight text-[color:var(--moni-text)]">{highestExpenseMonth?.monthLabel ?? '-'}</p>
                <p className="mt-2 text-sm text-[color:var(--moni-subtle)]">{highestExpenseMonth ? formatCurrency(highestExpenseMonth.totalExpense) : '-'}</p>
              </div>
              <div className="rounded-[1.35rem] bg-[#fff8ee] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--moni-subtle)]">Rata-rata / bulan</p>
                <p className="mt-3 text-lg font-semibold tracking-tight text-[color:var(--moni-text)]">{formatCurrency(averageMonthlyExpense)}</p>
                <p className="mt-2 text-sm text-[color:var(--moni-subtle)]">Dari {monthlyExpenseData.length} bulan aktif.</p>
              </div>
              <div className="rounded-[1.35rem] bg-[#fff1f8] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--moni-subtle)]">Perbandingan terakhir</p>
                <p className="mt-3 text-lg font-semibold tracking-tight text-[color:var(--moni-text)]">{latestMonthLabel ?? '-'}</p>
                <p className="mt-2 text-sm text-[color:var(--moni-subtle)]">{latestMonthDelta === null ? 'Belum ada pembanding.' : formatCurrency(Math.abs(latestMonthDelta))}</p>
              </div>
            </div>

            <div className="space-y-3">
              {monthlyExpenseData.map((item, index) => (
                <div key={item.monthKey} className="rounded-[1.4rem] border border-white/70 bg-[#fcfbff] p-4 shadow-[0_10px_30px_rgba(125,104,196,0.06)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">{item.monthKey}</p>
                      <h4 className="mt-1 text-lg font-semibold tracking-tight text-[color:var(--moni-text)]">{item.monthLabel}</h4>
                      <p className="mt-1 text-sm text-[color:var(--moni-subtle)]">{item.transactionCount} transaksi pengeluaran</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xl font-semibold tracking-tight text-[color:var(--moni-text)]">{formatCurrency(item.totalExpense)}</p>
                      <p className="mt-1 text-sm text-[color:var(--moni-subtle)]">{item.percentageOfPeriodExpense.toFixed(1)}% dari periode</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-violet-100/80">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${Math.max(item.percentageOfPeriodExpense, 6)}%` }} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--moni-subtle)]">{index === monthlyExpenseData.length - 1 ? latestMonthDeltaLabel : `${item.transactionCount} transaksi tercatat pada ${item.monthLabel}.`}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="Belum ada pengeluaran pada periode ini" description="Tambah transaksi pengeluaran atau perluas rentang tanggal agar grafik bulanan muncul." />
        )}
      </SectionFrame>

      <SectionFrame title="Pengeluaran per kategori" subtitle="Biar cepat tahu kategori mana yang paling banyak menyedot uang tanpa harus membandingkan satu per satu secara manual." icon={<PieChartIcon className="h-5 w-5" />}>
        {categoryData.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="h-[250px] min-h-0 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={64} outerRadius={88} paddingAngle={4} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '18px', border: '1px solid rgba(157,127,255,0.12)', boxShadow: '0 16px 40px rgba(125,104,196,0.12)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3 rounded-[1.2rem] bg-[#f9f7ff] px-4 py-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="flex-1 truncate text-sm font-medium text-[color:var(--moni-text)]">{item.name}</span>
                  <span className="text-sm text-[color:var(--moni-subtle)]">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="Belum ada distribusi kategori" description="Tambahkan transaksi pada rentang ini untuk melihat kategori belanja yang paling dominan." />
        )}
      </SectionFrame>

      <SectionFrame title="Tren harian pemasukan & pengeluaran" subtitle="Grafik sederhana supaya kamu cepat menangkap ritme harian tanpa visual yang terlalu ramai." icon={<BarChart3 className="h-5 w-5" />}>
        {dailyData.length > 0 ? (
          <div className="h-[320px] min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ece8ff" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8f86b3' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8f86b3' }} tickFormatter={(value) => `Rp${value / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '18px', border: '1px solid rgba(157,127,255,0.12)', boxShadow: '0 16px 40px rgba(125,104,196,0.12)' }} />
                <Bar dataKey="income" fill="#6ad3a1" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" fill="#ef7cc2" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="Belum ada tren harian" description="Tambahkan transaksi atau perlebar filter supaya pergerakan harian bisa dibaca lebih mudah." />
        )}
      </SectionFrame>
    </div>
  );
}
