import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Clock,
  FileText,
  Filter,
  Receipt,
  Tag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn, formatCurrency } from '../lib/utils';
import { Skeleton } from './Skeleton';
import type { TransactionRecord } from './financeTypes';

interface TransactionFilters {
  showFilters: boolean;
  category: string;
  startDate: string;
  endDate: string;
}

interface TransactionListViewProps {
  transactions: TransactionRecord[];
  groupedTransactions: Array<{ date: string; items: TransactionRecord[] }>;
  filters: TransactionFilters;
  uniqueCategories: string[];
  deletingId: string | null;
  viewingReceipt: string | null;
  viewingDetail: TransactionRecord | null;
  onToggleFilters: () => void;
  onCategoryFilterChange: (value: string) => void;
  onStartDateFilterChange: (value: string) => void;
  onEndDateFilterChange: (value: string) => void;
  onResetFilters: () => void;
  onViewDetail: (transaction: TransactionRecord) => void;
  onCloseDetail: () => void;
  onViewReceipt: (receipt: string | null) => void;
  onRequestDelete: (id: string | null) => void;
  onConfirmDelete: () => void;
  onEdit: (transaction: TransactionRecord) => void;
}

export function TransactionListSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-28 w-full rounded-[28px]" />
      {[1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-28 w-full rounded-[28px]" />
      ))}
    </div>
  );
}

function FilterPanel({
  filters,
  uniqueCategories,
  onCategoryFilterChange,
  onStartDateFilterChange,
  onEndDateFilterChange,
  onResetFilters,
}: Pick<TransactionListViewProps, 'filters' | 'uniqueCategories' | 'onCategoryFilterChange' | 'onStartDateFilterChange' | 'onEndDateFilterChange' | 'onResetFilters'>) {
  const hasActiveFilters = Boolean(filters.category || filters.startDate || filters.endDate);

  return (
    <AnimatePresence>
      {filters.showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_60px_rgba(148,163,184,0.16)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Filter riwayat</h3>
              {hasActiveFilters ? (
                <button onClick={onResetFilters} className="text-xs font-semibold text-rose-500">
                  Reset
                </button>
              ) : null}
            </div>
            <div className="space-y-3">
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>Kategori</span>
                <select value={filters.category} onChange={(event) => onCategoryFilterChange(event.target.value)} className="w-full rounded-[20px] bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">Semua kategori</option>
                  {uniqueCategories.filter(Boolean).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Dari</span>
                  <input type="date" value={filters.startDate} onChange={(event) => onStartDateFilterChange(event.target.value)} className="w-full rounded-[20px] bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400" />
                </label>
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Sampai</span>
                  <input type="date" value={filters.endDate} min={filters.startDate} disabled={!filters.startDate} onChange={(event) => onEndDateFilterChange(event.target.value)} className="w-full rounded-[20px] bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50" />
                </label>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TransactionRow({ item, isLast, onViewDetail, onViewReceipt, onRequestDelete, onEdit }: { item: TransactionRecord; isLast: boolean; onViewDetail: (transaction: TransactionRecord) => void; onViewReceipt: (receipt: string | null) => void; onRequestDelete: (id: string | null) => void; onEdit: (transaction: TransactionRecord) => void }) {
  return (
    <button
      type="button"
      onClick={() => onViewDetail(item)}
      className={cn('flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-slate-50', !isLast && 'border-b border-slate-100')}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn('rounded-[18px] p-3', item.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600')}>
          {item.type === 'income' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{item.category}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{item.note || 'Tanpa catatan tambahan'}</p>
          <p className="mt-1 text-[11px] text-slate-400">{item.authorName && item.authorName !== 'Unknown' ? item.authorName : 'Tanpa nama'}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
        <div className="text-right">
          <p className={cn('text-sm font-bold', item.type === 'income' ? 'text-emerald-600' : 'text-slate-900')}>
            {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{format(parseISO(item.date), 'dd MMM')}</p>
        </div>
        {item.receiptImage ? (
          <button type="button" onClick={() => onViewReceipt(item.receiptImage ?? null)} className="rounded-full p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-500" title="Lihat struk">
            <Receipt className="h-4 w-4" />
          </button>
        ) : null}
        <button type="button" onClick={() => onEdit(item)} className="rounded-full p-2 text-slate-400 transition hover:bg-sky-50 hover:text-sky-500" title="Edit transaksi">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
        </button>
        <button type="button" onClick={() => onRequestDelete(item.id)} className="rounded-full p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500" title="Hapus transaksi">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </button>
  );
}

function ReceiptViewer({ viewingReceipt, onClose }: { viewingReceipt: string | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {viewingReceipt ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <button onClick={onClose} className="absolute -top-12 right-0 rounded-full bg-white/10 p-2 text-white">
              <X className="h-6 w-6" />
            </button>
            <img src={viewingReceipt} alt="Struk belanja" className="max-h-[85vh] w-full rounded-[28px] object-contain shadow-2xl" />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[20px] bg-slate-50 px-4 py-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function TransactionDetailModal({ transaction, onClose, onViewReceipt }: { transaction: TransactionRecord | null; onClose: () => void; onViewReceipt: (receipt: string | null) => void }) {
  return (
    <AnimatePresence>
      {transaction ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 24, stiffness: 220 }} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[30px] bg-white p-5 shadow-2xl sm:rounded-[30px]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Detail transaksi</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">{transaction.category}</h3>
              </div>
              <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={cn('mb-5 rounded-[26px] p-5 text-white', transaction.type === 'income' ? 'bg-gradient-to-br from-emerald-400 to-emerald-500' : 'bg-gradient-to-br from-indigo-500 to-pink-500')}>
              <p className="text-sm text-white/80">{transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{formatCurrency(transaction.amount)}</p>
            </div>

            <div className="space-y-3">
              <DetailRow icon={<Calendar className="h-4 w-4" />} label="Tanggal" value={format(parseISO(transaction.date), 'dd MMM yyyy')} />
              <DetailRow icon={<Clock className="h-4 w-4" />} label="Waktu catat" value={transaction.createdAt ? format(new Date(transaction.createdAt), 'dd MMM yyyy, HH:mm') : '-'} />
              <DetailRow icon={<User className="h-4 w-4" />} label="Dicatat oleh" value={transaction.authorName && transaction.authorName !== 'Unknown' ? transaction.authorName : '-'} />
              <DetailRow icon={<Tag className="h-4 w-4" />} label="Kategori" value={transaction.category} />
              <DetailRow icon={<FileText className="h-4 w-4" />} label="Catatan" value={transaction.note || '-'} />
            </div>

            {transaction.receiptImage ? (
              <button type="button" onClick={() => onViewReceipt(transaction.receiptImage ?? null)} className="mt-5 w-full rounded-[22px] bg-slate-900 px-4 py-3 font-semibold text-white">
                Lihat struk
              </button>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DeleteConfirmationModal({ deletingId, onRequestDelete, onConfirmDelete }: Pick<TransactionListViewProps, 'deletingId' | 'onRequestDelete' | 'onConfirmDelete'>) {
  return (
    <AnimatePresence>
      {deletingId ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Hapus transaksi?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Tindakan ini tidak bisa dibatalkan. Pastikan data sudah benar sebelum menghapus.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => onRequestDelete(null)} className="flex-1 rounded-[20px] bg-slate-100 px-4 py-3 font-medium text-slate-700">Batal</button>
              <button onClick={onConfirmDelete} className="flex-1 rounded-[20px] bg-rose-500 px-4 py-3 font-medium text-white">Hapus</button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function TransactionListView(props: TransactionListViewProps) {
  const hasActiveFilters = Boolean(props.filters.category || props.filters.startDate || props.filters.endDate);

  return (
    <div className="space-y-5 pb-8">
      <section className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(148,163,184,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-400">Riwayat</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Semua transaksi tetap rapi</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Tidak terlalu banyak card. Fokus ke daftar, nominal, dan detail yang memang penting.</p>
          </div>
          <button onClick={props.onToggleFilters} className={cn('rounded-[20px] p-3 transition', props.filters.showFilters || hasActiveFilters ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500')}>
            <Filter className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[24px] bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total data</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{props.transactions.length}</p>
          </div>
          <div className="rounded-[24px] bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Filter aktif</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{hasActiveFilters ? 'Ya, sedang dipersempit' : 'Belum ada'}</p>
          </div>
        </div>
      </section>

      <FilterPanel
        filters={props.filters}
        uniqueCategories={props.uniqueCategories}
        onCategoryFilterChange={props.onCategoryFilterChange}
        onStartDateFilterChange={props.onStartDateFilterChange}
        onEndDateFilterChange={props.onEndDateFilterChange}
        onResetFilters={props.onResetFilters}
      />

      {props.groupedTransactions.length > 0 ? (
        props.groupedTransactions.map((group, index) => (
          <motion.section key={group.date} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="space-y-3">
            <p className="px-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{group.date}</p>
            <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_18px_60px_rgba(148,163,184,0.16)]">
              {group.items.map((item, itemIndex) => (
                <TransactionRow key={item.id} item={item} isLast={itemIndex === group.items.length - 1} onViewDetail={props.onViewDetail} onViewReceipt={props.onViewReceipt} onRequestDelete={props.onRequestDelete} onEdit={props.onEdit} />
              ))}
            </div>
          </motion.section>
        ))
      ) : (
        <section className="rounded-[32px] border border-dashed border-slate-200 bg-white/80 px-6 py-10 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Belum ada transaksi yang cocok</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Coba ubah filter atau tambahkan transaksi baru dari tombol plus di bawah.</p>
        </section>
      )}

      <ReceiptViewer viewingReceipt={props.viewingReceipt} onClose={() => props.onViewReceipt(null)} />
      <TransactionDetailModal transaction={props.viewingDetail} onClose={props.onCloseDetail} onViewReceipt={props.onViewReceipt} />
      <DeleteConfirmationModal deletingId={props.deletingId} onRequestDelete={props.onRequestDelete} onConfirmDelete={props.onConfirmDelete} />
    </div>
  );
}
