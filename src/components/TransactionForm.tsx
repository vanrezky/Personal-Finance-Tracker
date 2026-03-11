import { useState } from 'react';
import { db } from '../db';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface TransactionFormProps {
  onClose: () => void;
}

const EXPENSE_CATEGORIES = [
  'Makan', 'Jajan', 'Belanja Mingguan', 'BBM Mobil', 'BBM Motor',
  'Service Kendaraan', 'Token Listrik', 'Tagihan Air', 'Internet & Pulsa',
  'Transportasi', 'Hiburan', 'Lainnya'
];

const INCOME_CATEGORIES = [
  'Gaji', 'Bonus', 'Hasil Usaha', 'Investasi', 'Pemberian', 'Lainnya'
];

export function TransactionForm({ onClose }: TransactionFormProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setAmountStr('');
      return;
    }
    const formatted = new Intl.NumberFormat('id-ID').format(parseInt(rawValue, 10));
    setAmountStr(formatted);
  };

  const addAmount = (addValue: number) => {
    const current = parseInt(amountStr.replace(/\D/g, '') || '0', 10);
    const newValue = current + addValue;
    setAmountStr(new Intl.NumberFormat('id-ID').format(newValue));
  };

  const appendZeros = () => {
    if (!amountStr) return;
    const rawValue = amountStr.replace(/\D/g, '') + '000';
    setAmountStr(new Intl.NumberFormat('id-ID').format(parseInt(rawValue, 10)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseInt(amountStr.replace(/\D/g, ''), 10);
    if (!numericAmount || isNaN(numericAmount) || !category) return;

    try {
      await db.transactions.add({
        type,
        amount: numericAmount,
        category,
        note,
        date: new Date(date).toISOString(),
        synced: false,
      });
      onClose();
    } catch (error) {
      console.error('Failed to add transaction:', error);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="text-xl font-semibold text-slate-800">New Transaction</h2>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
            {/* Type Selector */}
            <div className="flex p-1 bg-slate-100 rounded-2xl relative">
              <div
                className={cn(
                  "absolute inset-y-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-in-out",
                  type === 'income' ? "left-1" : "left-[calc(50%+2px)]"
                )}
              />
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setCategory('');
                }}
                className={cn(
                  "flex-1 py-3 text-sm font-medium z-10 transition-colors",
                  type === 'income' ? "text-emerald-600" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setCategory('');
                }}
                className={cn(
                  "flex-1 py-3 text-sm font-medium z-10 transition-colors",
                  type === 'expense' ? "text-rose-600" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Expense
              </button>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600 px-1">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                <input
                  type="tel"
                  required
                  value={amountStr}
                  onChange={handleAmountChange}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-lg font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 transition-shadow"
                  placeholder="0"
                />
              </div>
              {/* Quick Amount Buttons */}
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1 hide-scrollbar">
                <button type="button" onClick={() => addAmount(10000)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-slate-200 active:scale-95 transition-all">+10rb</button>
                <button type="button" onClick={() => addAmount(50000)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-slate-200 active:scale-95 transition-all">+50rb</button>
                <button type="button" onClick={() => addAmount(100000)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-slate-200 active:scale-95 transition-all">+100rb</button>
                <button type="button" onClick={appendZeros} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-slate-200 active:scale-95 transition-all">+000</button>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 px-1">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map(cat => (
                  <label 
                    key={cat} 
                    className={cn(
                      "cursor-pointer flex items-center justify-center text-center px-1 py-3 rounded-xl border text-xs font-medium transition-all select-none h-full min-h-[3rem]", 
                      category === cat 
                        ? (type === 'income' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700") 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="category" 
                      value={cat} 
                      checked={category === cat} 
                      onChange={() => setCategory(cat)} 
                      className="hidden" 
                      required
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600 px-1">Note (Optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 focus:ring-2 focus:ring-slate-900 transition-shadow"
                placeholder="Add a note..."
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600 px-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 focus:ring-2 focus:ring-slate-900 transition-shadow"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-semibold text-lg hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Save Transaction
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
