import { useLiveQuery } from 'dexie-react-hooks';
import { db, Transaction } from '../db';
import { formatCurrency, cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Calendar, Tag, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface TransactionListProps {
  onEdit?: (tx: Transaction) => void;
}

export function TransactionList({ onEdit }: TransactionListProps) {
  const transactions = useLiveQuery(
    () => db.transactions.where('syncAction').notEqual('delete').reverse().sortBy('date'),
    []
  );

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

  const handleDelete = async (tx: Transaction) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    
    if (tx.id) {
      if (tx.synced === 1) {
        // If it was synced, mark it for deletion on the server
        await db.transactions.update(tx.id, {
          synced: 0,
          syncAction: 'delete'
        });
      } else {
        // If it was never synced, just delete it locally
        await db.transactions.delete(tx.id);
      }
    }
  };

  // Group by date
  const grouped = transactions.reduce((acc, curr) => {
    const dateStr = format(parseISO(curr.date), 'MMM dd, yyyy');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(curr);
    return acc;
  }, {} as Record<string, typeof transactions>);

  return (
    <div className="space-y-6 pb-24">
      {Object.entries(grouped).map(([date, items], groupIndex) => (
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
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-medium text-slate-900 leading-tight truncate">{item.category}</p>
                    {item.note && (
                      <p className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                        <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                        <span className="truncate">{item.note}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className={cn(
                    "text-sm sm:text-base font-semibold",
                    item.type === 'income' ? "text-emerald-600" : "text-slate-900"
                  )}>
                    {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onEdit?.(item)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
