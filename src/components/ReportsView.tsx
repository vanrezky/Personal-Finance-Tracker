import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calendar, BarChart3, PieChart as PieChartIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Skeleton } from './Skeleton';
import type { CategoryExpenseDatum, DailyTrendDatum, MonthlyExpenseItem } from './financeTypes';

const COLORS = ['#6366f1', '#f472b6', '#f59e0b', '#22c55e', '#38bdf8', '#a78bfa', '#fb7185'];

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

function Section({ title, description, icon, children }: { title: string; description?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(148,163,184,0.16)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        <div className="rounded-[20px] bg-slate-50 p-3 text-indigo-500">{icon}</div>
      </div>
      {children}
    </section>
  );
}

export function ReportsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-32 w-full rounded-[30px]" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-[28px]" />
        <Skeleton className="h-28 rounded-[28px]" />
      </div>
      <Skeleton className="h-80 w-full rounded-[32px]" />
      <Skeleton className="h-80 w-full rounded-[32px]" />
    </div>
  );
}

function ReportsEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
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
    <div className="space-y-5 pb-8">
      <Section title="Filter periode" description="Pilih rentang waktu untuk melihat statistik yang paling relevan." icon={<Calendar className="h-5 w-5" />}>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Mulai</span>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="w-full rounded-[22px] bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Selesai</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => onEndDateChange(event.target.value)}
              className="w-full rounded-[22px] bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </label>
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-[28px] border border-emerald-100 bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-emerald-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Pemasukan</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{formatCurrency(totalIncome)}</p>
          <p className="mt-2 text-sm text-slate-500">Total pemasukan pada rentang yang dipilih.</p>
        </div>
        <div className="rounded-[28px] border border-rose-100 bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-rose-500">
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Pengeluaran</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{formatCurrency(totalExpense)}</p>
          <p className="mt-2 text-sm text-slate-500">Total expense yang tercatat di periode ini.</p>
        </div>
      </div>

      <Section title="Expense breakdown" description="Visualisasi disederhanakan agar fokus pada pola pengeluaran utama." icon={<BarChart3 className="h-5 w-5" />}>
        {monthlyExpenseData.length > 0 ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Bulan tertinggi</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{highestExpenseMonth?.monthLabel ?? '-'}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{highestExpenseMonth ? formatCurrency(highestExpenseMonth.totalExpense) : '-'}</p>
              </div>
              <div className="rounded-[24px] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Rata-rata</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{formatCurrency(averageMonthlyExpense)}</p>
                <p className="mt-1 text-sm text-slate-500">Per bulan dalam periode ini.</p>
              </div>
              <div className="rounded-[24px] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Bulan terakhir</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{latestMonthLabel ?? '-'}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{latestMonthDelta === null ? '—' : formatCurrency(Math.abs(latestMonthDelta))}</p>
                <p className="mt-1 text-sm text-slate-500">{latestMonthDeltaLabel}</p>
              </div>
            </div>

            <div className="h-72 rounded-[24px] bg-slate-50 px-2 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyExpenseData}>
                  <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="totalExpense" radius={[16, 16, 8, 8]}>
                    {monthlyExpenseData.map((entry, index) => (
                      <Cell key={entry.monthKey} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <ReportsEmptyState title="Belum ada data bulanan" description="Tambahkan transaksi pengeluaran atau perluas periode supaya grafik bulanan bisa ditampilkan." />
        )}
      </Section>

      <Section title="Kategori utama" description="Proporsi kategori terbesar saja agar informasi tetap ringan dibaca." icon={<PieChartIcon className="h-5 w-5" />}>
        {categoryData.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
            <div className="h-72 rounded-[24px] bg-slate-50 px-2 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData.slice(0, 5)} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                    {categoryData.slice(0, 5).map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {categoryData.slice(0, 5).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between rounded-[22px] bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ReportsEmptyState title="Belum ada kategori pengeluaran" description="Saat sudah ada expense, kategori utama akan muncul di sini." />
        )}
      </Section>

      <Section title="Tren harian" description="Perbandingan pemasukan dan pengeluaran harian untuk periode terpilih." icon={<TrendingUp className="h-5 w-5" />}>
        {dailyData.length > 0 ? (
          <div className="h-72 rounded-[24px] bg-slate-50 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="income" radius={[12, 12, 0, 0]} fill="#4ade80" />
                <Bar dataKey="expense" radius={[12, 12, 0, 0]} fill="#fb7185" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ReportsEmptyState title="Belum ada tren harian" description="Belum ada transaksi pada periode ini, jadi grafik harian belum bisa ditampilkan." />
        )}
      </Section>
    </div>
  );
}
