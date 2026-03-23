import { useState, useEffect } from 'react';
import { db, collection, query, onSnapshot } from '../firebase';
import { formatCurrency } from '../lib/utils';
import { format, subMonths, startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Skeleton } from './Skeleton';

type MonthlyExpenseItem = {
  monthKey: string;
  monthLabel: string;
  totalExpense: number;
  percentageOfPeriodExpense: number;
  transactionCount: number;
};

export function Reports({ householdId }: { householdId: string }) {
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = `households/${householdId}/transactions`;
    const q = query(collection(db, path));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [householdId]);

  const filteredTransactions = transactions.filter(t => {
    const tDate = parseISO(t.date);
    return isWithinInterval(tDate, {
      start: startOfDay(parseISO(startDate)),
      end: endOfDay(parseISO(endDate))
    });
  });

  const { totalIncome, totalExpense } = filteredTransactions.reduce((acc, curr) => {
    if (curr.type === 'income') acc.totalIncome += curr.amount;
    else acc.totalExpense += curr.amount;
    return acc;
  }, { totalIncome: 0, totalExpense: 0 });

  const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');

  const monthlyExpenseData = Object.values(
    expenseTransactions.reduce<Record<string, Omit<MonthlyExpenseItem, 'percentageOfPeriodExpense'>>>((acc, curr) => {
      const monthDate = parseISO(curr.date);
      const monthKey = format(monthDate, 'yyyy-MM');

      if (!acc[monthKey]) {
        acc[monthKey] = {
          monthKey,
          monthLabel: format(monthDate, 'MMM yyyy'),
          totalExpense: 0,
          transactionCount: 0,
        };
      }

      acc[monthKey].totalExpense += curr.amount;
      acc[monthKey].transactionCount += 1;
      return acc;
    }, {})
  )
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((item) => ({
      ...item,
      percentageOfPeriodExpense: totalExpense > 0 ? (item.totalExpense / totalExpense) * 100 : 0,
    }));

  const highestExpenseMonth = monthlyExpenseData.reduce<MonthlyExpenseItem | null>((highest, item) => {
    if (!highest || item.totalExpense > highest.totalExpense) {
      return item;
    }

    return highest;
  }, null);

  const averageMonthlyExpense = monthlyExpenseData.length > 0 ? totalExpense / monthlyExpenseData.length : 0;
  const latestMonth = monthlyExpenseData[monthlyExpenseData.length - 1];
  const previousMonth = monthlyExpenseData[monthlyExpenseData.length - 2];
  const latestMonthDelta = latestMonth && previousMonth
    ? latestMonth.totalExpense - previousMonth.totalExpense
    : null;
  const latestMonthDeltaLabel = latestMonthDelta === null
    ? 'Belum ada pembanding bulan sebelumnya.'
    : latestMonthDelta === 0
      ? `Stabil dibanding ${previousMonth?.monthLabel}.`
      : `${latestMonthDelta > 0 ? '+' : '-'}${formatCurrency(Math.abs(latestMonthDelta))} vs ${previousMonth?.monthLabel}`;

  // Data for Category Pie Chart
  const categoryData = expenseTransactions
    .reduce((acc: any[], curr) => {
      const existing = acc.find(a => a.name === curr.category);
      if (existing) existing.value += curr.amount;
      else acc.push({ name: curr.category, value: curr.amount });
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  // Data for Daily Bar Chart
  const dailyData = filteredTransactions.reduce((acc: any[], curr) => {
    const date = parseISO(curr.date);
    const dateStr = format(date, 'dd MMM');
    const existing = acc.find(a => a.date === dateStr);
    if (existing) {
      if (curr.type === 'income') existing.income += curr.amount;
      else existing.expense += curr.amount;
    } else {
      acc.push({
        date: dateStr,
        rawDate: date,
        income: curr.type === 'income' ? curr.amount : 0,
        expense: curr.type === 'expense' ? curr.amount : 0
      });
    }
    return acc;
  }, []).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

  const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

  if (loading) {
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

  return (
    <div className="space-y-8 pb-12">
      {/* Date Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-semibold mb-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3>Filter Periode</h3>
        </div>
        <div className="flex items-end justify-between gap-2 flex-nowrap">
          <div className="space-y-1 min-w-0 flex-1 basis-[48%]">
            <label className="block truncate px-1 text-[10px] sm:text-xs uppercase tracking-wider font-bold text-slate-400">Mulai</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full min-w-0 px-2.5 py-2.5 text-xs sm:px-4 sm:py-3 sm:text-sm bg-slate-50 border-none rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1 min-w-0 flex-1 basis-[48%]">
            <label className="block truncate px-1 text-[10px] sm:text-xs uppercase tracking-wider font-bold text-slate-400">Selesai</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full min-w-0 px-2.5 py-2.5 text-xs sm:px-4 sm:py-3 sm:text-sm bg-slate-50 border-none rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Pemasukan</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-emerald-900 break-words">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100">
          <div className="flex items-center gap-2 text-rose-600 mb-2">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Pengeluaran</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-rose-900 break-words">{formatCurrency(totalExpense)}</p>
        </div>
      </div>

      {/* Monthly Expense Breakdown */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-semibold mb-2">
              <TrendingDown className="w-5 h-5 text-rose-500" />
              <h3>Pengeluaran per Bulan</h3>
            </div>
            <p className="text-sm text-slate-500">
              {monthlyExpenseData.length <= 1
                ? 'Periode aktif hanya mencakup satu bulan, jadi seluruh pengeluaran diringkas dalam satu entry.'
                : 'Pantau kontribusi setiap bulan terhadap total pengeluaran pada periode filter aktif.'}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 sm:max-w-xs">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-500">Total periode</p>
            <p className="mt-1 text-lg font-bold text-rose-950">{formatCurrency(totalExpense)}</p>
            <p className="mt-1 text-xs text-rose-700">Dihitung dari transaksi expense dalam rentang tanggal saat ini.</p>
          </div>
        </div>

        {monthlyExpenseData.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Bulan tertinggi</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{highestExpenseMonth?.monthLabel}</p>
                <p className="mt-1 text-base font-bold text-slate-950">{highestExpenseMonth ? formatCurrency(highestExpenseMonth.totalExpense) : '-'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Rata-rata per bulan</p>
                <p className="mt-2 text-base font-bold text-slate-950">{formatCurrency(averageMonthlyExpense)}</p>
                <p className="mt-1 text-xs text-slate-500">{monthlyExpenseData.length} bulan dengan pengeluaran pada periode ini.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Selisih bulan terakhir</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{latestMonth?.monthLabel ?? '-'}</p>
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
                          ? 'Semua pengeluaran pada filter aktif terjadi di bulan ini.'
                          : delta === null
                            ? 'Ini adalah bulan pertama pada rentang filter aktif.'
                            : delta === 0
                              ? 'Nominalnya sama dengan bulan sebelumnya.'
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
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Belum ada pengeluaran bulanan</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">Tidak ada transaksi expense pada periode filter aktif.</p>
            <p className="mt-1 text-sm text-slate-500">Coba perluas rentang tanggal atau tambahkan transaksi pengeluaran baru untuk melihat ringkasan bulanan di sini.</p>
          </div>
        )}
      </div>

      {/* Expense by Category */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <PieChartIcon className="w-5 h-5 text-indigo-600" />
            <h3>Pengeluaran per Kategori</h3>
          </div>
        </div>

        {categoryData.length > 0 ? (
          <div className="w-full">
            <div className="h-[240px] w-full min-w-0 min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-6 border-t border-slate-50 pt-6">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[10px] sm:text-xs text-slate-600 truncate flex-1">{item.name}</span>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-900 shrink-0">{Math.round((item.value / totalExpense) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-sm">Tidak ada data pengeluaran</div>
        )}
      </div>

      {/* Daily Trend */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 text-slate-900 font-semibold mb-6">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <h3>Tren Harian</h3>
        </div>
        <div className="h-[300px] w-full min-w-0 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(value) => `Rp${value/1000}k`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
