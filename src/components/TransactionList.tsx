import { useState, useEffect, useMemo } from 'react';
import { db, collection, query, orderBy, onSnapshot, doc, deleteDoc } from '../firebase';
import { formatCurrency, cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Calendar, Tag, Trash2, Filter, X, User, Receipt, Clock, FileText, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Skeleton } from './Skeleton';

export function TransactionList({ householdId, onEdit }: { householdId: string, onEdit: (transaction: any) => void }) {
  const [transactions, setTransactions] = useState<any[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [viewingDetail, setViewingDetail] = useState<any | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

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

  useEffect(() => {
    const path = `households/${householdId}/categories`;
    const q = query(collection(db, path));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map(doc => doc.data().name as string);
      setCustomCategories(cats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
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
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-24 ml-1" />
            <div className="bg-white rounded-3xl border border-slate-100 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-1">Belum ada transaksi</h3>
        <p className="text-slate-500 text-xs sm:text-sm">Ketuk tombol + untuk menambahkan transaksi pertama Anda.</p>
      </div>
    );
  }

  // Extract unique categories for the filter dropdown
  const uniqueCategories = Array.from(new Set([
    ...transactions.map(t => t.category),
    ...customCategories
  ])).sort();

  // Apply filters
  const filteredTransactions = transactions.filter(t => {
    let matches = true;
    
    if (filterCategory && t.category !== filterCategory) {
      matches = false;
    }
    
    if (filterStartDate) {
      // t.date is ISO string, e.g., "2023-10-25T00:00:00.000Z"
      // filterStartDate is "YYYY-MM-DD"
      const tDateOnly = t.date.split('T')[0];
      if (tDateOnly < filterStartDate) {
        matches = false;
      }
    }
    
    if (filterEndDate) {
      const tDateOnly = t.date.split('T')[0];
      if (tDateOnly > filterEndDate) {
        matches = false;
      }
    }
    
    return matches;
  });

  // Group by date
  const grouped = filteredTransactions.reduce((acc, curr) => {
    const dateStr = format(parseISO(curr.date), 'MMM dd, yyyy');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6 pb-24">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Riwayat Transaksi</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "p-2 rounded-full transition-colors flex items-center gap-2 text-sm font-medium",
            showFilters || filterCategory || filterStartDate || filterEndDate
              ? "bg-indigo-50 text-indigo-600"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-4 mb-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">Filter Data</h3>
                {(filterCategory || filterStartDate || filterEndDate) && (
                  <button
                    onClick={() => {
                      setFilterCategory('');
                      setFilterStartDate('');
                      setFilterEndDate('');
                    }}
                    className="text-xs text-rose-500 font-medium hover:text-rose-600 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 px-1">Kategori</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option key="all" value="">Semua Kategori</option>
                    {uniqueCategories.filter(Boolean).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 px-1">Dari Tanggal</label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => {
                        setFilterStartDate(e.target.value);
                        // If start date is cleared, also clear end date to enforce the rule
                        if (!e.target.value) {
                          setFilterEndDate('');
                        }
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 px-1">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      disabled={!filterStartDate}
                      min={filterStartDate}
                      className="w-full px-3 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                {!filterStartDate && (
                  <p className="text-[10px] text-slate-400 px-1 italic">
                    * Pilih 'Dari Tanggal' terlebih dahulu untuk mengatur 'Sampai Tanggal'.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-1">Tidak ada hasil</h3>
          <p className="text-slate-500 text-xs sm:text-sm">Coba ubah filter untuk melihat transaksi lainnya.</p>
        </div>
      ) : (
        (Object.entries(grouped) as [string, any[]][]).map(([date, items], groupIndex) => (
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
                  "flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 transition-colors cursor-pointer",
                  index !== items.length - 1 && "border-b border-slate-50"
                )}
                onClick={() => setViewingDetail(item)}
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
                    <p className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                      <span className="truncate">{item.authorName && item.authorName !== 'Unknown' ? item.authorName : '-'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 ml-4" onClick={(e) => e.stopPropagation()}>
                  <div className={cn(
                    "text-sm sm:text-base font-semibold whitespace-nowrap",
                    item.type === 'income' ? "text-emerald-600" : "text-slate-900"
                  )}>
                    {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {item.receiptImage && (
                      <button
                        onClick={() => setViewingReceipt(item.receiptImage)}
                        className="p-1.5 sm:p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                        title="Lihat Struk"
                      >
                        <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(item)}
                      className="p-1.5 sm:p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 sm:w-4 sm:h-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="p-1.5 sm:p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )))}

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

      {/* Receipt Viewer Modal */}
      <AnimatePresence>
        {viewingReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"
            onClick={() => setViewingReceipt(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setViewingReceipt(null)}
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
              <img 
                src={viewingReceipt} 
                alt="Struk Belanja" 
                className="rounded-xl max-h-[85vh] object-contain shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {viewingDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
            onClick={() => setViewingDetail(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-semibold text-slate-800">Detail Transaksi</h2>
                <button
                  onClick={() => setViewingDetail(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <div className={cn(
                    "p-4 rounded-full mb-2",
                    viewingDetail.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {viewingDetail.type === 'income' ? (
                      <ArrowDownRight className="w-8 h-8" />
                    ) : (
                      <ArrowUpRight className="w-8 h-8" />
                    )}
                  </div>
                  <h3 className={cn(
                    "text-3xl font-bold",
                    viewingDetail.type === 'income' ? "text-emerald-600" : "text-slate-900"
                  )}>
                    {viewingDetail.type === 'income' ? '+' : '-'}{formatCurrency(viewingDetail.amount)}
                  </h3>
                  <p className="text-slate-500 font-medium">{viewingDetail.category}</p>
                </div>

                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-0.5">Tanggal</p>
                      <p className="text-sm text-slate-900">{format(parseISO(viewingDetail.date), 'EEEE, dd MMMM yyyy')}</p>
                    </div>
                  </div>
                  
                  {viewingDetail.note && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500 font-medium mb-0.5">Catatan</p>
                        <p className="text-sm text-slate-900">{viewingDetail.note}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-0.5">Ditambahkan oleh</p>
                      <p className="text-sm text-slate-900">{viewingDetail.authorName && viewingDetail.authorName !== 'Unknown' ? viewingDetail.authorName : '-'}</p>
                    </div>
                  </div>
                  
                  {viewingDetail.receiptImage && (
                    <div className="flex items-start gap-3">
                      <ImageIcon className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <div className="w-full">
                        <p className="text-xs text-slate-500 font-medium mb-2">Struk Belanja</p>
                        <div 
                          className="relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer group"
                          onClick={() => {
                            setViewingDetail(null);
                            setViewingReceipt(viewingDetail.receiptImage);
                          }}
                        >
                          <img 
                            src={viewingDetail.receiptImage} 
                            alt="Struk" 
                            className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105" 
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shadow-sm">
                              <Receipt className="w-3.5 h-3.5" /> Lihat Penuh
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
