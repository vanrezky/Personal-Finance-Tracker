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
import { Calendar, TrendingDown, TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Skeleton } from './Skeleton';
import type { CategoryExpenseDatum, DailyTrendDatum, MonthlyExpenseItem } from './financeTypes';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

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
    <div className="space-y-8">
      <Skeleton className="h-40 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-3xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-3xl" />
      <Skeleton className="h-80 w-full rounded-3xl" />
    </div>
  );
}

function SummaryCard({ title, value, tone }: { title: string; value: number; tone: 'income' | 'expense' }) {
  const isIncome = tone === 'income';
  const Icon = isIncome ? TrendingUp : TrendingDown;

  return (
    <div className={isIncome ? 'rounded-3xl border border-emerald-100 bg-emerald-50 p-5' : 'rounded-3xl border border-rose-100 bg-rose-50 p-5'}>
      <div className={isIncome ? 'mb-2 flex items-center gap-2 text-emerald-600' : 'mb-2 flex items-center gap-2 text-rose-600'}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
      </div>
      <p className={isIncome ? 'break-words text-lg font-bold text-emerald-900 sm:text-xl' : 'break-words text-lg font-bold text-rose-900 sm:text-xl'}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function ReportsPeriodFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: Pick<ReportsViewProps, 'startDate' | 'endDate' | 'onStartDateChange' | 'onEndDateChange'>) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
        <Calendar className="h-5 w-5 text-indigo-600" />
        <h3>Pilih periode</h3>
      </div>
      <div className="flex flex-nowrap items-end justify-between gap-2">
        <div className="min-w-0 flex-1 basis-[48%] space-y-1">
          <label className="block truncate px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">Mulai</label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="w-full min-w-0 rounded-xl border-none bg-slate-50 px-2.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 sm:px-4 sm:py-3 sm:text-sm"
          />
        </div>
        <div className="min-w-0 flex-1 basis-[48%] space-y-1">
          <label className="block truncate px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">Selesai</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(event) => onEndDateChange(event.target.value)}
            className="w-full min-w-0 rounded-xl border-none bg-slate-50 px-2.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 sm:px-4 sm:py-3 sm:text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function ReportsEmptyState({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
      <p className="mt-2 text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ReportsChartSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-2 font-semibold text-slate-900">
        {icon}
        <h3>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MonthlyExpenseSection({
  monthlyExpenseData,
  highestExpenseMonth,
  averageMonthlyExpense,
  latestMonthLabel,
  latestMonthDelta,
  latestMonthDeltaLabel,
  totalExpense,
}: Pick<ReportsViewProps, 'monthlyExpenseData' | 'highestExpenseMonth' | 'averageMonthlyExpense' | 'latestMonthLabel' | 'latestMonthDelta' | 'latestMonthDeltaLabel' | 'totalExpense'>) {
  return (
    <div className="space-y-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
            <TrendingDown className="h-5 w-5 text-rose-500" />
            <h3>Pengeluaran per Bulan</h3>
          </div>
          <p className="text-sm text-slate-500">
            {monthlyExpenseData.length <= 1
              ? 'Periode ini hanya mencakup satu bulan, jadi semua pengeluaran dirangkum dalam satu bagian.'
              : 'Lihat seberapa besar sumbangan tiap bulan terhadap total pengeluaran pada periode yang kamu pilih.'}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 sm:max-w-xs">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-500">Total periode</p>
          <p className="mt-1 text-lg font-bold text-rose-950">{formatCurrency(totalExpense)}</p>
          <p className="mt-1 text-xs text-rose-700">Dihitung dari semua transaksi pengeluaran pada rentang tanggal ini.</p>
        </div>
      </div>

      {monthlyExpenseData.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Bulan tertinggi</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{highestExpenseMonth?.monthLabel ?? '-'}</p>
              <p className="mt-1 text-base font-bold text-slate-950">{highestExpenseMonth ? formatCurrency(highestExpenseMonth.totalExpense) : '-'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Rata-rata per bulan</p>
              <p className="mt-2 text-base font-bold text-slate-950">{formatCurrency(averageMonthlyExpense)}</p>
              <p className="mt-1 text-xs text-slate-500">Ada {monthlyExpenseData.length} bulan dengan catatan pengeluaran di periode ini.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Selisih bulan terakhir</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{latestMonthLabel ?? '-'}</p>
              <p className={`mt-1 text-base font-bold ${latestMonthDelta !== null && latestMonthDelta > 0 ? 'text-rose-600' : latestMonthDelta !== null && latestMonthDelta < 0 ? 'text-emerald-600' : 'text-slate-950'}`}>
                {latestMonthDelta === null ? '—' : formatCurrency(Math.abs(latestMonthDelta))}
              </p>
              <p className="mt-1 text-xs text-slate-500">{latestMonthDeltaLabel}</p>
            </div>
          </div>

          <div className="space-y-3">
            {monthlyExpenseData.map((item, index) => {
              const previousItem = monthlyExpenseData[index - 1];
              const delta = previousItem ? item.totalExpense - previousItem.totalExpense : null;

              return (
                <div key={item.monthKey} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-100/80">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{item.monthKey}</p>
                      <h4 className="mt-1 text-sm font-semibold text-slate-900">{item.monthLabel}</h4>
                      <p className="mt-1 text-xs text-slate-500">{item.transactionCount} transaksi pengeluaran</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-base font-bold text-slate-950">{formatCurrency(item.totalExpense)}</p>
                      <p className="mt-1 text-sm font-semibold text-rose-600">{item.percentageOfPeriodExpense.toFixed(1)}% dari total periode</p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-400 via-rose-500 to-orange-400"
                      style={{ width: `${Math.max(item.percentageOfPeriodExpense, 6)}%` }}
                    />
                  </div>

                  <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {monthlyExpenseData.length === 1
                        ? 'Semua pengeluaran pada periode ini terjadi di bulan yang sama.'
                        : delta === null
                          ? 'Ini bulan pertama dalam rentang yang sedang kamu lihat.'
                          : delta === 0
                            ? 'Nominalnya sama seperti bulan sebelumnya.'
                            : `${delta > 0 ? 'Naik' : 'Turun'} ${formatCurrency(Math.abs(delta))} dibanding ${previousItem?.monthLabel}.`}
                    </span>
                    <span className="font-medium text-slate-600">{item.percentageOfPeriodExpense.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <ReportsEmptyState
          eyebrow="Belum ada ringkasan bulanan"
          title="Belum ada transaksi pengeluaran di periode ini."
          description="Coba perluas rentang tanggal atau tambahkan pengeluaran baru supaya ringkasan bulanannya muncul di sini."
        />
      )}
    </div>
  );
}

export function ReportsView(props: ReportsViewProps) {
  const {
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
  } = props;

  return (
    <div className="space-y-8">
      <ReportsPeriodFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard title="Pemasukan" value={totalIncome} tone="income" />
        <SummaryCard title="Pengeluaran" value={totalExpense} tone="expense" />
      </div>

      <MonthlyExpenseSection
        monthlyExpenseData={monthlyExpenseData}
        highestExpenseMonth={highestExpenseMonth}
        averageMonthlyExpense={averageMonthlyExpense}
        latestMonthLabel={latestMonthLabel}
        latestMonthDelta={latestMonthDelta}
        latestMonthDeltaLabel={latestMonthDeltaLabel}
        totalExpense={totalExpense}
      />

      <ReportsChartSection title="Pengeluaran per kategori" icon={<PieChartIcon className="h-5 w-5 text-indigo-600" />}>
        {categoryData.length > 0 ? (
          <div className="w-full">
            <div className="h-[240px] min-h-0 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-50 pt-6">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex min-w-0 items-center gap-2">
                  <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="flex-1 truncate text-[10px] text-slate-600 sm:text-xs">{item.name}</span>
                  <span className="shrink-0 text-[10px] font-bold text-slate-900 sm:text-xs">{totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ReportsEmptyState eyebrow="Belum ada data" title="Belum ada data pengeluaran" description="Tambahkan transaksi pengeluaran pada rentang tanggal ini untuk melihat pembagian per kategori." />
        )}
      </ReportsChartSection>

      <ReportsChartSection title="Tren harian" icon={<BarChart3 className="h-5 w-5 text-indigo-600" />}>
        {dailyData.length > 0 ? (
          <div className="h-[300px] min-h-0 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `Rp${value / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ReportsEmptyState eyebrow="Belum ada tren" title="Belum ada transaksi di rentang tanggal ini" description="Perluas periode atau tambahkan transaksi supaya pergerakan harian bisa terlihat." />
        )}
      </ReportsChartSection>
    </div>
  );
}
