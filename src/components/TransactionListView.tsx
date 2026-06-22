import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Clock,
  FileText,
  Filter,
  Image as ImageIcon,
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
    <div className="space-y-6">
      {[1, 2, 3].map((item) => (
        <div key={item} className="space-y-3">
          <Skeleton className="ml-1 h-4 w-24" />
          <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-4">
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

function TransactionFilterPanel({
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
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="mb-2 space-y-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Saring transaksi</h3>
              {hasActiveFilters && (
                <button onClick={onResetFilters} className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600">
                  <X className="h-3 w-3" /> Bersihkan
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="px-1 text-xs font-medium text-slate-500">Kategori</label>
                <select
                  value={filters.category}
                  onChange={(event) => onCategoryFilterChange(event.target.value)}
                  className="w-full rounded-xl border-none bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Semua Kategori</option>
                  {uniqueCategories.filter(Boolean).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="px-1 text-xs font-medium text-slate-500">Dari Tanggal</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(event) => onStartDateFilterChange(event.target.value)}
                    className="w-full rounded-xl border-none bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="px-1 text-xs font-medium text-slate-500">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(event) => onEndDateFilterChange(event.target.value)}
                    disabled={!filters.startDate}
                    min={filters.startDate}
                    className="w-full rounded-xl border-none bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              {!filters.startDate && (
                <p className="px-1 text-[10px] italic text-slate-400">* Pilih 'Dari Tanggal' terlebih dahulu untuk mengatur 'Sampai Tanggal'.</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TransactionRow({
  item,
  isLast,
  onViewDetail,
  onViewReceipt,
  onRequestDelete,
  onEdit,
}: {
  item: TransactionRecord;
  isLast: boolean;
  onViewDetail: (transaction: TransactionRecord) => void;
  onViewReceipt: (receipt: string | null) => void;
  onRequestDelete: (id: string | null) => void;
  onEdit: (transaction: TransactionRecord) => void;
}) {
  return (
    <div
      className={cn(
        'flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-slate-50 sm:p-4',
        !isLast && 'border-b border-slate-50'
      )}
      onClick={() => onViewDetail(item)}
    >
      <div className="flex items-center gap-3 overflow-hidden sm:gap-4">
        <div className={cn('flex shrink-0 items-center justify-center rounded-xl p-2.5 sm:rounded-2xl sm:p-3', item.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
          {item.type === 'income' ? <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5" /> : <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />}
        </div>
        <div className="min-w-0 flex-col justify-center">
          <p className="truncate text-sm font-medium leading-tight text-slate-900 sm:text-base">{item.category}</p>
          {item.note && (
            <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-slate-500 sm:text-xs">
              <Tag className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" />
              <span className="truncate">{item.note}</span>
            </p>
          )}
          <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-400 sm:text-xs">
            <User className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" />
            <span className="truncate">{item.authorName && item.authorName !== 'Unknown' ? item.authorName : '-'}</span>
          </p>
        </div>
      </div>
      <div className="ml-4 flex items-center gap-2 sm:gap-4" onClick={(event) => event.stopPropagation()}>
        <div className={cn('whitespace-nowrap text-sm font-semibold sm:text-base', item.type === 'income' ? 'text-emerald-600' : 'text-slate-900')}>
          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1">
          {item.receiptImage && (
            <button onClick={() => onViewReceipt(item.receiptImage ?? null)} className="rounded-full p-1.5 text-slate-300 transition-colors hover:bg-indigo-50 hover:text-indigo-500 sm:p-2" title="Lihat Struk">
              <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
          <button onClick={() => onEdit(item)} className="rounded-full p-1.5 text-slate-300 transition-colors hover:bg-blue-50 hover:text-blue-500 sm:p-2" title="Edit transaksi">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
          </button>
          <button onClick={() => onRequestDelete(item.id)} className="rounded-full p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500 sm:p-2" title="Hapus transaksi">
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupedDateSection({
  date,
  items,
  index,
  onViewDetail,
  onViewReceipt,
  onRequestDelete,
  onEdit,
}: {
  date: string;
  items: TransactionRecord[];
  index: number;
  onViewDetail: (transaction: TransactionRecord) => void;
  onViewReceipt: (receipt: string | null) => void;
  onRequestDelete: (id: string | null) => void;
  onEdit: (transaction: TransactionRecord) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="space-y-3">
      <h3 className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">{date}</h3>
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        {items.map((item, itemIndex) => (
          <TransactionRow
            key={item.id}
            item={item}
            isLast={itemIndex === items.length - 1}
            onViewDetail={onViewDetail}
            onViewReceipt={onViewReceipt}
            onRequestDelete={onRequestDelete}
            onEdit={onEdit}
          />
        ))}
      </div>
    </motion.div>
  );
}

function ReceiptViewer({ viewingReceipt, onClose }: { viewingReceipt: string | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {viewingReceipt && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative flex max-h-[90vh] w-full max-w-2xl flex-col items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <button onClick={onClose} className="absolute -top-12 right-0 p-2 text-white/70 transition-colors hover:text-white">
              <X className="h-8 w-8" />
            </button>
            <img src={viewingReceipt} alt="Struk Belanja" className="max-h-[85vh] rounded-xl object-contain shadow-2xl" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TransactionDetailModal({ transaction, onClose, onViewReceipt }: { transaction: TransactionRecord | null; onClose: () => void; onViewReceipt: (receipt: string | null) => void }) {
  return (
    <AnimatePresence>
      {transaction && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-xl font-semibold text-slate-800">Detail Transaksi</h2>
              <button onClick={onClose} className="rounded-full bg-slate-100 p-2 transition-colors hover:bg-slate-200">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto p-6">
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <div className={cn('flex h-16 w-16 items-center justify-center rounded-full', transaction.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                  {transaction.type === 'income' ? <ArrowDownRight className="h-8 w-8" /> : <ArrowUpRight className="h-8 w-8" />}
                </div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">{transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
                <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(transaction.amount)}</h3>
                <p className="text-sm font-medium text-slate-500">{transaction.category}</p>
              </div>

              <div className="space-y-3 rounded-3xl bg-slate-50 p-4">
                <DetailRow icon={<Clock className="h-4 w-4" />} label="Tanggal" value={format(parseISO(transaction.date), 'dd MMM yyyy')} />
                <DetailRow icon={<User className="h-4 w-4" />} label="Dicatat oleh" value={transaction.authorName && transaction.authorName !== 'Unknown' ? transaction.authorName : '-'} />
                <DetailRow icon={<FileText className="h-4 w-4" />} label="Catatan" value={transaction.note || '-'} />
              </div>

              {transaction.receiptImage && (
                <button onClick={() => onViewReceipt(transaction.receiptImage ?? null)} className="flex w-full items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-left text-indigo-700 transition-colors hover:bg-indigo-100">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-semibold">Lihat lampiran struk</p>
                      <p className="text-xs text-indigo-600/80">Buka struk dalam tampilan penuh.</p>
                    </div>
                  </div>
                  <Receipt className="h-5 w-5" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3">
      <div className="rounded-xl bg-slate-100 p-2 text-slate-500">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({ deletingId, onClose, onConfirm }: { deletingId: string | null; onClose: () => void; onConfirm: () => void }) {
  return (
    <AnimatePresence>
      {deletingId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-slate-900">Hapus transaksi ini?</h3>
            <p className="mb-6 text-sm text-slate-500">Transaksi ini akan dihapus permanen dan tidak bisa dikembalikan lagi.</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-200">Batal</button>
              <button onClick={onConfirm} className="flex-1 rounded-xl bg-rose-600 px-4 py-3 font-medium text-white transition-colors hover:bg-rose-700">Ya, hapus</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function TransactionListView(props: TransactionListViewProps) {
  const hasActiveFilters = Boolean(props.filters.category || props.filters.startDate || props.filters.endDate);

  if (props.transactions.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Calendar className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mb-1 text-base font-medium text-slate-900 sm:text-lg">Belum ada transaksi</h3>
        <p className="text-xs text-slate-500 sm:text-sm">Ketuk tombol + untuk mulai mencatat transaksi pertamamu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Riwayat transaksi</h2>
        <button
          onClick={props.onToggleFilters}
          className={cn(
            'flex items-center gap-2 rounded-full p-2 text-sm font-medium transition-colors',
            props.filters.showFilters || hasActiveFilters ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      <TransactionFilterPanel
        filters={props.filters}
        uniqueCategories={props.uniqueCategories}
        onCategoryFilterChange={props.onCategoryFilterChange}
        onStartDateFilterChange={props.onStartDateFilterChange}
        onEndDateFilterChange={props.onEndDateFilterChange}
        onResetFilters={props.onResetFilters}
      />

      {props.groupedTransactions.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Filter className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-1 text-base font-medium text-slate-900 sm:text-lg">Belum ketemu transaksi</h3>
          <p className="text-xs text-slate-500 sm:text-sm">Coba ubah saringannya supaya transaksi lain ikut tampil.</p>
        </div>
      ) : (
        props.groupedTransactions.map((group, index) => (
          <GroupedDateSection
            key={group.date}
            date={group.date}
            items={group.items}
            index={index}
            onViewDetail={props.onViewDetail}
            onViewReceipt={props.onViewReceipt}
            onRequestDelete={props.onRequestDelete}
            onEdit={props.onEdit}
          />
        ))
      )}

      <DeleteConfirmationModal deletingId={props.deletingId} onClose={() => props.onRequestDelete(null)} onConfirm={props.onConfirmDelete} />
      <ReceiptViewer viewingReceipt={props.viewingReceipt} onClose={() => props.onViewReceipt(null)} />
      <TransactionDetailModal transaction={props.viewingDetail} onClose={props.onCloseDetail} onViewReceipt={props.onViewReceipt} />
    </div>
  );
}
