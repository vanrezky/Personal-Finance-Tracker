import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, doc, getDoc } from '../firebase';
import { formatCurrency } from '../lib/utils';
import { ArrowDownRight, ArrowUpRight, Wallet, CalendarDays } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { parseISO, isWithinInterval, startOfDay, endOfDay, setDate, subMonths, addMonths } from 'date-fns';
import { Skeleton } from './Skeleton';

export function Dashboard({ householdId }: { householdId: string }) {
  const [transactions, setTransactions] = useState<any[] | null>(null);
  const [payday, setPayday] = useState<number>(25); // Default payday is 25th

  useEffect(() => {
    const householdPath = `households/${householdId}`;
    getDoc(doc(db, householdPath)).then(snap => {
      if (snap.exists() && snap.data().payday) {
        setPayday(snap.data().payday);
      }
    });

    const path = `households/${householdId}/transactions`;
    const q = query(collection(db, path));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setTransactions([]);
    });

    return () => unsubscribe();
  }, [householdId]);

  // Calculate current cycle dates
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

  const cycleTransactions = (transactions || []).filter(t => {
    const tDate = parseISO(t.date);
    return isWithinInterval(tDate, { start: cycleStart, end: cycleEnd });
  });

  const { income, expense, balance } = (transactions || []).reduce(
    (acc, curr) => {
      if (curr.type === 'income') {
        acc.income += curr.amount;
        acc.balance += curr.amount;
      } else {
        acc.expense += curr.amount;
        acc.balance -= curr.amount;
      }
      return acc;
    },
    { income: 0, expense: 0, balance: 0 }
  );

  const { cycleIncome, cycleExpense } = cycleTransactions.reduce(
    (acc, curr) => {
      if (curr.type === 'income') acc.cycleIncome += curr.amount;
      else acc.cycleExpense += curr.amount;
      return acc;
    },
    { cycleIncome: 0, cycleExpense: 0 }
  );

  if (!transactions) {
    return (
      <div className="space-y-6">
        {/* Total Balance Skeleton */}
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <Skeleton className="h-4 w-24 bg-slate-700" />
            <Skeleton className="h-10 w-48 bg-slate-700" />
          </div>
        </div>

        {/* Monthly Cycle Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100/50 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full bg-emerald-100" />
                <Skeleton className="h-3 w-16 bg-emerald-100" />
              </div>
              <Skeleton className="h-6 w-24 bg-emerald-100" />
            </div>

            <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100/50 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full bg-rose-100" />
                <Skeleton className="h-3 w-16 bg-rose-100" />
              </div>
              <Skeleton className="h-6 w-24 bg-rose-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-900/10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Wallet className="w-32 h-32" />
        </div>
        
        <div className="relative z-10">
          <p className="text-slate-400 text-sm font-medium mb-1">Total Saldo</p>
          <h2 className="text-4xl font-semibold tracking-tight">
            {formatCurrency(balance)}
          </h2>
        </div>
      </motion.div>

      {/* Monthly Cycle Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm">Bulan Ini (Gajian tgl {payday})</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Siklus: {cycleStart.getDate()} - {cycleEnd.getDate()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100/50"
          >
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <div className="bg-emerald-100 p-1.5 rounded-full">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Pemasukan</span>
            </div>
            <p className="text-lg font-bold text-emerald-950">
              {formatCurrency(cycleIncome)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-rose-50 p-5 rounded-3xl border border-rose-100/50"
          >
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <div className="bg-rose-100 p-1.5 rounded-full">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Pengeluaran</span>
            </div>
            <p className="text-lg font-bold text-rose-950">
              {formatCurrency(cycleExpense)}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
