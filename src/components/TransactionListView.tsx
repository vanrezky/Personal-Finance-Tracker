import { useMemo, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { AnimatePresence, motion } from 'motion/react';
import type { RefObject } from 'react';
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
import { id } from 'date-fns/locale';
import { cn, formatCurrency } from '../lib/utils';
import { Skeleton } from './Skeleton';
import type { TransactionDurationFilter } from './TransactionList';
import type { TransactionRecord } from './financeTypes';

interface TransactionFilters {
  showFilters: boolean;
  duration: TransactionDurationFilter;
  category: string;
  startDate: string;
  endDate: string;
}

const durationFilterOptions: Array<{ value: TransactionDurationFilter; label: string }> = [
  { value: 'today', label: 'Hari ini' },
  { value: 'yesterday', label: 'Kemarin' },
  { value: 'last7days', label: '7 Hari' },
  { value: 'all', label: 'Semua' },
];

interface TransactionListViewProps {
  transactions: TransactionRecord[];
  groupedTransactions: Array<{ date: string; items: TransactionRecord[] }>;
  filters: TransactionFilters;
  uniqueCategories: string[];
  deletingId: string | null;
  hasMoreTransactions: boolean;
  isLoadingMoreTransactions: boolean;
  loadMoreSentinelRef: RefObject<HTMLDivElement | null>;
  viewingReceipt: string | null;
  viewingDetail: TransactionRecord | null;
  onToggleFilters: () => void;
  onDurationFilterChange: (value: TransactionDurationFilter) => void;
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

function TransactionFilterPanel({ filters, uniqueCategories, onDurationFilterChange, onCategoryFilterChange, onStartDateFilterChange, onEndDateFilterChange, onResetFilters, }: Pick<TransactionListViewProps, 'filters' | 'uniqueCategories' | 'onDurationFilterChange' | 'onCategoryFilterChange' | 'onStartDateFilterChange' | 'onEndDateFilterChange' | 'onResetFilters'>) {
  const hasActiveFilters = Boolean(filters.category || filters.startDate || filters.endDate);
  const canEditDateRange = filters.duration === 'all';
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const selectedRange = useMemo<DateRange | undefined>(() => ({
    from: filters.startDate ? parseISO(filters.startDate) : undefined,
    to: filters.endDate ? parseISO(filters.endDate) : undefined,
  }), [filters.endDate, filters.startDate]);

  const dateRangeLabel = formatDateRangeLabel(filters.startDate, filters.endDate);

  const applyRange = (range: DateRange | undefined) => {
    onStartDateFilterChange(range?.from ? format(range.from, 'yyyy-MM-dd') : '');
    onEndDateFilterChange(range?.to ? format(range.to, 'yyyy-MM-dd') : '');
  };

  if (!filters.showFilters) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
        <div className="mb-5 space-y-4 rounded-[26px] border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200/50">
          <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr_auto]">
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kategori</span>
              <select value={filters.category} onChange={(event) => onCategoryFilterChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white">
                <option value="">Semua kategori</option>
                {uniqueCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Rentang tanggal</span>
              <button type="button" disabled={!canEditDateRange} onClick={() => setIsDatePickerOpen(true)} className={cn('flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium outline-none transition', canEditDateRange ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white' : 'cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400')}>
                <span className="min-w-0 truncate">{canEditDateRange ? dateRangeLabel : 'Pilih Semua untuk ubah tanggal'}</span>
                <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </div>

            <button type="button" disabled={!hasActiveFilters && filters.duration === 'today'} onClick={onResetFilters} className="self-end rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">
              Reset
            </button>
          </div>
        </div>
      </motion.div>

      {isDatePickerOpen && (
        <DateRangePickerSheet selectedRange={selectedRange} onClose={() => setIsDatePickerOpen(false)} onApply={(range) => { applyRange(range); setIsDatePickerOpen(false); }} />
      )}
    </AnimatePresence>
  );
}

function DateRangePickerSheet({ selectedRange, onApply, onClose }: {
  selectedRange: DateRange | undefined;
  onApply: (range: DateRange | undefined) => void;
  onClose: () => void;
}) {
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(selectedRange);
  const today = new Date();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 px-3 pb-3 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 240 }} className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Filter riwayat</p>
            <h3 className="text-lg font-bold text-slate-950">Pilih tanggal</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-3xl border border-slate-100 p-2">
            <DayPicker mode="range" selected={draftRange} onSelect={setDraftRange} locale={id} captionLayout="dropdown" className="finance-date-picker" disabled={{ after: today }} />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setDraftRange(undefined)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200">Hapus</button>
            <button type="button" onClick={() => onApply(draftRange)} className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-200/70 transition hover:bg-slate-800">Terapkan</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function formatDateRangeLabel(startDate: string, endDate: string) {
  if (!startDate && !endDate) return 'Semua tanggal';
  if (startDate && endDate) return format(parseISO(startDate), 'dd MMM yyyy', { locale: id }) + ' - ' + format(parseISO(endDate), 'dd MMM yyyy', { locale: id });
  if (startDate) return 'Mulai ' + format(parseISO(startDate), 'dd MMM yyyy', { locale: id });
  return 'Sampai ' + format(parseISO(endDate), 'dd MMM yyyy', { locale: id });
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
      className={cn('flex cursor-pointer items-center justify-between -mx-4 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:py-5', !isLast && 'border-b border-[#E8E8E8]')}
      onClick={() => onViewDetail(item)}
    >
      <div className="flex items-center gap-3 overflow-hidden sm:gap-4">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', item.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
          {item.type === 'income' ? <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5" /> : <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />}
        </div>
        <div className="min-w-0 flex-col justify-center">
          <p className="text-sm font-medium leading-tight text-slate-900 sm:text-base">{item.category}</p>
          {item.note && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-[#A9A9A9]">
              <Tag className="h-2.5 w-2.5 shrink-0" />
              <span>{item.note}</span>
            </p>
          )}
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400 sm:text-xs">
            <User className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" />
            <span>{item.authorName && item.authorName !== 'Unknown' ? item.authorName : '-'}</span>
          </p>
        </div>
      </div>
      <div className="ml-4 flex items-center gap-2 sm:gap-4" onClick={(event) => event.stopPropagation()}>
        <div className={cn('whitespace-nowrap text-sm font-semibold sm:text-base', item.type === 'income' ? 'text-emerald-600' : 'text-slate-900')}>
          {item.type === 'income' ? '+' : ''}{formatCurrency(item.amount)}
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
      <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white px-4 shadow-sm shadow-slate-200/60">
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm" onClick={onClose}>
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

  return (
    <div className="space-y-6 pb-24">
      <div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-500">Riwayat</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Transaksi</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Semua arus masuk dan keluar rumah tangga.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <div className="overflow-x-auto overflow-y-hidden">
            <div className="flex min-w-max items-center gap-2 pr-10">
              {durationFilterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => props.onDurationFilterChange(option.value)}
                  className={cn(
                    'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors',
                    props.filters.duration === option.value
                      ? 'bg-[#1A1A1A] text-white'
                      : 'bg-[#F8F9FB] text-[#606266] hover:bg-[#eef1f5]'
                  )}
                >
                  <span className="whitespace-nowrap">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-12"
            style={{ background: 'linear-gradient(90deg, #FFFFFF00 0%, #FFFFFF 100%)' }}
          />
        </div>

        <button
          onClick={props.onToggleFilters}
          aria-label="Buka filter"
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1A1A1A] transition-colors hover:bg-slate-50',
            props.filters.showFilters || hasActiveFilters ? 'border-[#1A1A1A]' : ''
          )}
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      <TransactionFilterPanel
        filters={props.filters}
        uniqueCategories={props.uniqueCategories}
        onDurationFilterChange={props.onDurationFilterChange}
        onCategoryFilterChange={props.onCategoryFilterChange}
        onStartDateFilterChange={props.onStartDateFilterChange}
        onEndDateFilterChange={props.onEndDateFilterChange}
        onResetFilters={props.onResetFilters}
      />

      {props.groupedTransactions.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            {hasActiveFilters ? <Filter className="h-8 w-8 text-slate-400" /> : <Calendar className="h-8 w-8 text-slate-400" />}
          </div>
          <h3 className="mb-1 text-base font-medium text-slate-900 sm:text-lg">
            {hasActiveFilters ? 'Belum ketemu transaksi' : 'Belum ada transaksi'}
          </h3>
          <p className="text-xs text-slate-500 sm:text-sm">
            {hasActiveFilters ? 'Coba ubah saringannya supaya transaksi lain ikut tampil.' : 'Ketuk tombol + untuk mulai mencatat transaksi pertamamu.'}
          </p>
        </div>
      ) : (
        <>
          {props.groupedTransactions.map((group, index) => (
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
          ))}
          {props.hasMoreTransactions && (
            <div ref={props.loadMoreSentinelRef} className="flex justify-center py-4">
              <div className="text-xs font-medium text-slate-400">{props.isLoadingMoreTransactions ? 'Memuat...' : ' '}</div>
            </div>
          )}
        </>
      )}

      <DeleteConfirmationModal deletingId={props.deletingId} onClose={() => props.onRequestDelete(null)} onConfirm={props.onConfirmDelete} />
      <ReceiptViewer viewingReceipt={props.viewingReceipt} onClose={() => props.onViewReceipt(null)} />
      <TransactionDetailModal transaction={props.viewingDetail} onClose={props.onCloseDetail} onViewReceipt={props.onViewReceipt} />
    </div>
  );
}
