import { useState, useEffect } from 'react';
import { db, collection, query, orderBy, onSnapshot, doc, deleteDoc } from '../firebase';
import { formatCurrency, cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Calendar, Tag, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function TransactionList({ householdId, onEdit }: { householdId: string, onEdit: (transaction: any) => void }) {
  const [transactions, setTransactions] = useState<any[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const path = `households/${householdId}/transactions`;
    const q = query(
      collection(db, path),
      orderBy('date', 'desc')
    );
    
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

  const handleDelete = async () => {
    if (!deletingId) return;
    const path = `households/${householdId}/transactions/${deletingId}`;
    try {
      await deleteDoc(doc(db, path));
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  if (!transactions) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-1">No transactions yet</h3>
        <p className="text-slate-500 text-xs sm:text-sm">Tap the + button to add your first transaction.</p>
      </div>
    );
  }

  // Group by date
  const grouped = transactions.reduce((acc, curr) => {
    const dateStr = format(parseISO(curr.date), 'MMM dd, yyyy');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6 pb-24">
      {(Object.entries(grouped) as [string, any[]][]).map(([date, items], groupIndex) => (
        <motion.div
          key={date}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIndex * 0.1 }}
          className="space-y-3"
        >
          <h3 className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            {date}
          </h3>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between p-3 sm:p-4",
                  index !== items.length - 1 && "border-b border-slate-50"
                )}
              >
                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                  <div
                    className={cn(
                      "p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0",
                      item.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}
                  >
                    {item.type === 'income' ? (
                      <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <p className="text-sm sm:text-base font-medium text-slate-900 leading-tight truncate">{item.category}</p>
                    {item.note && (
                      <p className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                        <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                        <span className="truncate">{item.note}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "text-sm sm:text-base font-semibold",
                    item.type === 'income' ? "text-emerald-600" : "text-slate-900"
                  )}>
                    {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                  </div>
                  <button
                    onClick={() => onEdit(item)}
                    className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </button>
                  <button
                    onClick={() => setDeletingId(item.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Transaksi?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Transaksi ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 px-4 bg-rose-600 text-white font-medium rounded-xl hover:bg-rose-700 transition-colors"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
