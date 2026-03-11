import { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot } from '../firebase';
import { formatCurrency } from '../lib/utils';
import { format, subMonths, startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Download, TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

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

  // Data for Category Pie Chart
  const categoryData = filteredTransactions
    .filter(t => t.type === 'expense')
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
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-1">Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-1">Selesai</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
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
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
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
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
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
