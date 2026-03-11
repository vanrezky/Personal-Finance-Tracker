import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query } from '../firebase';
import { formatCurrency } from '../lib/utils';
import { ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function Dashboard({ householdId }: { householdId: string }) {
  const [transactions, setTransactions] = useState<any[] | null>(null);

  useEffect(() => {
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

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-900/10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Wallet className="w-32 h-32" />
        </div>
        
        <div className="relative z-10">
          <p className="text-slate-400 text-sm font-medium mb-1">Total Balance</p>
          <h2 className="text-4xl font-semibold tracking-tight">
            {formatCurrency(balance)}
          </h2>
        </div>
      </motion.div>

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
            <span className="text-sm font-medium">Income</span>
          </div>
          <p className="text-lg font-semibold text-emerald-950">
            {formatCurrency(income)}
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
            <span className="text-sm font-medium">Expense</span>
          </div>
          <p className="text-lg font-semibold text-rose-950">
            {formatCurrency(expense)}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
