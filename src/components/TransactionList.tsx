import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatCurrency, cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Calendar, Tag } from 'lucide-react';
import { motion } from 'motion/react';

export function TransactionList() {
  const transactions = useLiveQuery(
    () => db.transactions.orderBy('date').reverse().toArray(),
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
        <h3 className="text-lg font-medium text-slate-900 mb-1">No transactions yet</h3>
        <p className="text-slate-500 text-sm">Tap the + button to add your first transaction.</p>
      </div>
    );
  }

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
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            {date}
          </h3>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between p-4",
                  index !== items.length - 1 && "border-b border-slate-50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "p-3 rounded-2xl",
                      item.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}
                  >
                    {item.type === 'income' ? (
                      <ArrowDownRight className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{item.category}</p>
                    {item.note && (
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                        <Tag className="w-3 h-3" />
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>
                <div className={cn(
                  "font-semibold",
                  item.type === 'income' ? "text-emerald-600" : "text-slate-900"
                )}>
                  {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
