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
    <div className="space-y-5">
      <Skeleton className="h-36 w-full rounded-[1.8rem]" />
      {[1, 2].map((item) => (
        <div key={item} className="space-y-3">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-44 w-full rounded-[1.7rem]" />
        </div>
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
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="moni-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Filter</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-[color:var(--moni-text)]">Cari transaksi yang kamu butuhkan</h3>
              </div>
              {hasActiveFilters && (
                <button onClick={onResetFilters} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-100">Reset</button>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Kategori</label>
                <select value={filters.category} onChange={(event) => onCategoryFilterChange(event.target.value)} className="moni-input">
                  <option value="">Semua kategori</option>
                  {uniqueCategories.filter(Boolean).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Dari tanggal</label>
                  <input type="date" value={filters.startDate} onChange={(event) => onStartDateFilterChange(event.target.value)} className="moni-input" />
                </div>
                <div className="space-y-2">
                  <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Sampai tanggal</label>
                  <input type="date" value={filters.endDate} onChange={(event) => onEndDateFilterChange(event.target.value)} disabled={!filters.startDate} min={filters.startDate} className="moni-input disabled:cursor-not-allowed disabled:opacity-60" />
                </div>
              </div>
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
    <div className={cn('flex cursor-pointer items-center justify-between gap-3 px-4 py-4 transition hover:bg-[#faf8ff]', !isLast && 'border-b border-violet-50')} onClick={() => onViewDetail(item)}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem]', item.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-[#fff1f8] text-fuchsia-500')}>
          {item.type === 'income' ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[color:var(--moni-text)] sm:text-base">{item.category}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--moni-subtle)]">
            {item.note && (
              <span className="inline-flex min-w-0 items-center gap-1 truncate">
                <Tag className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.note}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" /> {item.authorName && item.authorName !== 'Unknown' ? item.authorName : '-'}
            </span>
          </div>
        </div>
      </div>

      <div className="ml-3 flex items-center gap-3" onClick={(event) => event.stopPropagation()}>
        <div className={cn('text-right text-sm font-semibold sm:text-base', item.type === 'income' ? 'text-emerald-500' : 'text-[color:var(--moni-text)]')}>
          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
        </div>
        <div className="flex items-center gap-1">
          {item.receiptImage && (
            <button onClick={() => onViewReceipt(item.receiptImage ?? null)} className="rounded-full p-2 text-violet-300 transition hover:bg-violet-50 hover:text-violet-500" title="Lihat struk">
              <Receipt className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => onEdit(item)} className="rounded-full p-2 text-sky-300 transition hover:bg-sky-50 hover:text-sky-500" title="Edit transaksi">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
          </button>
          <button onClick={() => onRequestDelete(item.id)} className="rounded-full p-2 text-rose-300 transition hover:bg-rose-50 hover:text-rose-500" title="Hapus transaksi">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupSection({
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
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full bg-violet-300" />
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--moni-subtle)]">{date}</h3>
      </div>
      <div className="moni-card overflow-hidden p-1.5">
        {items.map((item, itemIndex) => (
          <TransactionRow key={item.id} item={item} isLast={itemIndex === items.length - 1} onViewDetail={onViewDetail} onViewReceipt={onViewReceipt} onRequestDelete={onRequestDelete} onEdit={onEdit} />
        ))}
      </div>
    </motion.section>
  );
}

function ReceiptViewer({ viewingReceipt, onClose }: { viewingReceipt: string | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {viewingReceipt && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative flex max-h-[90vh] w-full max-w-2xl flex-col items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <button onClick={onClose} className="absolute -top-12 right-0 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30">
              <X className="h-6 w-6" />
            </button>
            <img src={viewingReceipt} alt="Struk belanja" className="max-h-[85vh] rounded-[1.4rem] object-contain shadow-2xl" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] bg-[#f9f7ff] p-4">
      <div className="mb-2 flex items-center gap-2 text-violet-500">{icon}<span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">{label}</span></div>
      <p className="text-sm leading-6 text-[color:var(--moni-text)]">{value}</p>
    </div>
  );
}

function DetailModal({ transaction, onClose, onViewReceipt }: { transaction: TransactionRecord | null; onClose: () => void; onViewReceipt: (receipt: string | null) => void }) {
  return (
    <AnimatePresence>
      {transaction && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 24, stiffness: 220 }} className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_24px_60px_rgba(84,64,150,0.24)]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">Detail transaksi</p>
                <h3 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-[color:var(--moni-text)]">{formatCurrency(transaction.amount)}</h3>
                <p className="mt-1 text-sm text-[color:var(--moni-subtle)]">{transaction.category}</p>
              </div>
              <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-[#f7f4ff] text-violet-500">
              {transaction.type === 'income' ? <ArrowDownRight className="h-6 w-6" /> : <ArrowUpRight className="h-6 w-6" />}
            </div>

            <div className="space-y-3">
              <DetailRow icon={<Clock className="h-4 w-4" />} label="Tanggal" value={format(parseISO(transaction.date), 'dd MMM yyyy')} />
              <DetailRow icon={<User className="h-4 w-4" />} label="Dicatat oleh" value={transaction.authorName && transaction.authorName !== 'Unknown' ? transaction.authorName : '-'} />
              <DetailRow icon={<FileText className="h-4 w-4" />} label="Catatan" value={transaction.note || '-'} />
            </div>

            {transaction.receiptImage && (
              <button onClick={() => onViewReceipt(transaction.receiptImage ?? null)} className="mt-5 flex w-full items-center justify-between rounded-[1.3rem] bg-[#fff1f8] px-4 py-3 text-left text-fuchsia-500 transition hover:bg-[#ffe6f4]">
                <div className="flex items-center gap-3">
                  <ImageIcon className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-semibold">Lihat lampiran struk</p>
                    <p className="text-xs text-fuchsia-400">Buka viewer struk layar penuh.</p>
                  </div>
                </div>
                <Receipt className="h-5 w-5" />
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DeleteModal({ deletingId, onClose, onConfirm }: { deletingId: string | null; onClose: () => void; onConfirm: () => void }) {
  return (
    <AnimatePresence>
      {deletingId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-sm rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_24px_60px_rgba(84,64,150,0.24)]">
            <h3 className="text-lg font-semibold tracking-tight text-[color:var(--moni-text)]">Hapus transaksi?</h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--moni-subtle)]">Transaksi ini akan dihapus permanen. Kalau masih ragu, lebih aman edit dulu daripada langsung hapus.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-[1.25rem] bg-slate-100 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-200">Batal</button>
              <button onClick={onConfirm} className="flex-1 rounded-[1.25rem] bg-rose-500 px-4 py-3 font-semibold text-white transition hover:bg-rose-600">Ya, hapus</button>
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
      <div className="moni-card px-5 py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-[#f7f4ff] text-violet-500">
          <Calendar className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-[color:var(--moni-text)]">Belum ada transaksi</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[color:var(--moni-subtle)]">Ketuk tombol tambah untuk mulai mencatat pemasukan atau pengeluaran pertama.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <section className="moni-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">Riwayat transaksi</p>
            <h2 className="mt-2 text-[1.9rem] font-semibold tracking-tight text-[color:var(--moni-text)]">Catatan yang lebih rapi</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[color:var(--moni-subtle)]">Fokus ke nominal, kategori, dan siapa yang mencatat. Detail lainnya tetap ada, tapi tidak mengganggu pandangan utama.</p>
          </div>
          <button onClick={props.onToggleFilters} className={cn('inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition', props.filters.showFilters || hasActiveFilters ? 'bg-violet-100 text-violet-600' : 'bg-[#f7f4ff] text-[color:var(--moni-subtle)] hover:bg-violet-100 hover:text-violet-600')}>
            <Filter className="h-4 w-4" />
            {hasActiveFilters ? 'Filter aktif' : 'Buka filter'}
          </button>
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

      {props.groupedTransactions.length === 0 ? (
        <div className="moni-card px-5 py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-[#fff1f8] text-fuchsia-500">
            <Filter className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-semibold tracking-tight text-[color:var(--moni-text)]">Tidak ada hasil</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[color:var(--moni-subtle)]">Ubah filter atau perlebar rentang tanggal supaya transaksi lain muncul.</p>
        </div>
      ) : (
        props.groupedTransactions.map((group, index) => (
          <GroupSection key={group.date} date={group.date} items={group.items} index={index} onViewDetail={props.onViewDetail} onViewReceipt={props.onViewReceipt} onRequestDelete={props.onRequestDelete} onEdit={props.onEdit} />
        ))
      )}

      <DeleteModal deletingId={props.deletingId} onClose={() => props.onRequestDelete(null)} onConfirm={props.onConfirmDelete} />
      <ReceiptViewer viewingReceipt={props.viewingReceipt} onClose={() => props.onViewReceipt(null)} />
      <DetailModal transaction={props.viewingDetail} onClose={props.onCloseDetail} onViewReceipt={props.onViewReceipt} />
    </div>
  );
}
