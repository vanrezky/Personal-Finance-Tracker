import { AnimatePresence, motion } from 'motion/react';
import { Camera, Check, Edit2, Loader2, Mic, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import type { CategoryRecord, TransactionType } from './financeTypes';

interface CategoryOption {
  id: string;
  name: string;
  isCustom: boolean;
  record?: CategoryRecord;
}

interface TransactionFormViewProps {
  mode: 'create' | 'edit';
  type: TransactionType;
  amountStr: string;
  category: string;
  note: string;
  date: string;
  receiptImage: string | null;
  isListening: boolean;
  isScanning: boolean;
  isSubmitting: boolean;
  categoryObjects: CategoryOption[];
  isCategoryModalOpen: boolean;
  editingCategory: CategoryRecord | null;
  newCategoryName: string;
  isSavingCategory: boolean;
  onClose: () => void;
  onTypeChange: (type: TransactionType) => void;
  onAmountChange: (value: string) => void;
  onQuickAmountAdd: (value: number) => void;
  onAppendZeros: () => void;
  onCategoryChange: (category: string) => void;
  onOpenNewCategoryModal: () => void;
  onEditCategory: (category: CategoryRecord) => void;
  onDeleteCategory: (category: CategoryRecord) => void;
  onNoteChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onClearReceiptImage: () => void;
  onStartListening: () => void;
  onTriggerScanReceipt: () => void;
  onReceiptFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCloseCategoryModal: () => void;
  onCategoryNameChange: (value: string) => void;
  onSubmitCategory: (event: React.FormEvent<HTMLFormElement>) => void;
}

function VoiceScanActions({ mode, isListening, isScanning, onStartListening, onTriggerScanReceipt, onReceiptFileChange, fileInputRef }: Pick<TransactionFormViewProps, 'mode' | 'isListening' | 'isScanning' | 'onStartListening' | 'onTriggerScanReceipt' | 'onReceiptFileChange' | 'fileInputRef'>) {
  if (mode === 'edit') return null;

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onStartListening} disabled={isListening || isScanning} className={cn('relative rounded-full p-2.5 transition disabled:opacity-50', isListening ? 'bg-rose-100 text-rose-600' : 'bg-white/80 text-slate-500 hover:bg-white')} title="Input suara">
        {isListening ? (
          <>
            <Mic className="h-5 w-5" />
            <span className="absolute inset-0 animate-ping rounded-full bg-rose-300 opacity-30" />
          </>
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>
      <button type="button" onClick={onTriggerScanReceipt} disabled={isListening || isScanning} className={cn('rounded-full p-2.5 transition disabled:opacity-50', isScanning ? 'bg-indigo-100 text-indigo-600' : 'bg-white/80 text-slate-500 hover:bg-white')} title="Scan struk">
        {isScanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
      </button>
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={onReceiptFileChange} className="hidden" />
    </div>
  );
}

function ReceiptPreview({ receiptImage, onClearReceiptImage }: Pick<TransactionFormViewProps, 'receiptImage' | 'onClearReceiptImage'>) {
  if (!receiptImage) return null;

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-slate-50">
      <img src={receiptImage} alt="Struk" className="h-40 w-full object-cover" />
      <button type="button" onClick={onClearReceiptImage} className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-rose-500 shadow-sm">
        <X className="h-4 w-4" />
      </button>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-white"><Check className="h-4 w-4 text-emerald-300" /> Struk berhasil dipilih</p>
      </div>
    </div>
  );
}

function QuickAmountChips({ onQuickAmountAdd, onAppendZeros }: Pick<TransactionFormViewProps, 'onQuickAmountAdd' | 'onAppendZeros'>) {
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
      {[10000, 50000, 100000].map((value) => (
        <button key={value} type="button" onClick={() => onQuickAmountAdd(value)} className="whitespace-nowrap rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
          +{value === 10000 ? '10rb' : value === 50000 ? '50rb' : '100rb'}
        </button>
      ))}
      <button type="button" onClick={onAppendZeros} className="whitespace-nowrap rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
        +000
      </button>
    </div>
  );
}

function CategoryPicker({ type, category, categoryObjects, onCategoryChange, onOpenNewCategoryModal, onEditCategory, onDeleteCategory }: Pick<TransactionFormViewProps, 'type' | 'category' | 'categoryObjects' | 'onCategoryChange' | 'onOpenNewCategoryModal' | 'onEditCategory' | 'onDeleteCategory'>) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-700">Kategori</label>
      <div className="grid grid-cols-3 gap-2">
        {categoryObjects.map((categoryItem) => (
          <div key={categoryItem.id} className="group relative">
            <label className={cn('flex min-h-[3.25rem] cursor-pointer items-center justify-center rounded-[18px] border px-2 py-3 text-center text-xs font-medium transition', category === categoryItem.name ? type === 'income' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-pink-200 bg-pink-50 text-pink-600' : 'border-white/70 bg-white/80 text-slate-600')}>
              <input type="radio" name="category" value={categoryItem.name} checked={category === categoryItem.name} onChange={() => onCategoryChange(categoryItem.name)} className="hidden" required />
              <span className="line-clamp-2">{categoryItem.name}</span>
            </label>
            {categoryItem.isCustom ? (
              <div className="absolute -right-1.5 -top-1.5 hidden gap-1 group-hover:flex">
                <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (categoryItem.record) onEditCategory(categoryItem.record); }} className="rounded-full bg-sky-100 p-1.5 text-sky-600 shadow-sm">
                  <Edit2 className="h-3 w-3" />
                </button>
                <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (categoryItem.record) onDeleteCategory(categoryItem.record); }} className="rounded-full bg-rose-100 p-1.5 text-rose-600 shadow-sm">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : null}
          </div>
        ))}
        <button type="button" onClick={onOpenNewCategoryModal} className="flex min-h-[3.25rem] items-center justify-center gap-1 rounded-[18px] border border-dashed border-slate-300 bg-white/60 px-2 py-3 text-xs font-medium text-slate-500">
          <Plus className="h-3.5 w-3.5" /> Tambah
        </button>
      </div>
    </div>
  );
}

function CategoryModal({ isCategoryModalOpen, editingCategory, newCategoryName, isSavingCategory, onCloseCategoryModal, onCategoryNameChange, onSubmitCategory }: Pick<TransactionFormViewProps, 'isCategoryModalOpen' | 'editingCategory' | 'newCategoryName' | 'isSavingCategory' | 'onCloseCategoryModal' | 'onCategoryNameChange' | 'onSubmitCategory'>) {
  return (
    <AnimatePresence>
      {isCategoryModalOpen ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">{editingCategory ? 'Edit kategori' : 'Tambah kategori baru'}</h3>
            <form onSubmit={onSubmitCategory} className="mt-4 space-y-4">
              <input type="text" required autoFocus value={newCategoryName} onChange={(event) => onCategoryNameChange(event.target.value)} className="w-full rounded-[20px] bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400" placeholder="Contoh: Cicilan rumah" />
              <div className="flex gap-3">
                <button type="button" onClick={onCloseCategoryModal} className="flex-1 rounded-[20px] bg-slate-100 px-4 py-3 font-medium text-slate-700">Batal</button>
                <button type="submit" disabled={!newCategoryName.trim() || isSavingCategory} className="flex flex-1 items-center justify-center rounded-[20px] bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-60">
                  {isSavingCategory ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'Simpan'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function TransactionFormView(props: TransactionFormViewProps) {
  const title = props.mode === 'edit' ? 'Edit transaksi' : 'Transaksi baru';

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 24, stiffness: 220 }} className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[32px] bg-[linear-gradient(180deg,#f7f5ff_0%,#ffffff_26%,#ffffff_100%)] shadow-2xl sm:rounded-[32px]">
          <div className="flex items-center justify-between border-b border-white/70 px-5 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-400">Input</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <VoiceScanActions mode={props.mode} isListening={props.isListening} isScanning={props.isScanning} onStartListening={props.onStartListening} onTriggerScanReceipt={props.onTriggerScanReceipt} onReceiptFileChange={props.onReceiptFileChange} fileInputRef={props.fileInputRef} />
              <button onClick={props.onClose} className="rounded-full bg-white/80 p-2.5 text-slate-500 shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <form onSubmit={props.onSubmit} className="space-y-5 overflow-y-auto px-5 py-5">
            <div className="rounded-[28px] bg-gradient-to-br from-indigo-500 via-indigo-500 to-pink-400 p-4 text-white shadow-[0_18px_50px_rgba(99,102,241,0.25)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white/75">Nominal transaksi</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-lg font-semibold text-white/80">Rp</span>
                    <input type="tel" required value={props.amountStr} onChange={(event) => props.onAmountChange(event.target.value)} className="w-full bg-transparent text-4xl font-bold tracking-tight text-white outline-none placeholder:text-white/40" placeholder="0" />
                  </div>
                </div>
                <div className="rounded-[22px] bg-white/10 p-3">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
              <QuickAmountChips onQuickAmountAdd={props.onQuickAmountAdd} onAppendZeros={props.onAppendZeros} />
            </div>

            <div className="relative flex rounded-[24px] bg-slate-100 p-1">
              <div className={cn('absolute inset-y-1 w-[calc(50%-4px)] rounded-[20px] bg-white shadow-sm transition-all', props.type === 'income' ? 'left-1' : 'left-[calc(50%+2px)]')} />
              <button type="button" onClick={() => props.onTypeChange('income')} className={cn('z-10 flex-1 rounded-[20px] py-3 text-sm font-semibold transition', props.type === 'income' ? 'text-emerald-600' : 'text-slate-500')}>
                Pemasukan
              </button>
              <button type="button" onClick={() => props.onTypeChange('expense')} className={cn('z-10 flex-1 rounded-[20px] py-3 text-sm font-semibold transition', props.type === 'expense' ? 'text-pink-500' : 'text-slate-500')}>
                Pengeluaran
              </button>
            </div>

            <ReceiptPreview receiptImage={props.receiptImage} onClearReceiptImage={props.onClearReceiptImage} />

            <div className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-sm">
              <div className="space-y-4">
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Catatan</span>
                  <input type="text" value={props.note} onChange={(event) => props.onNoteChange(event.target.value)} className="w-full rounded-[20px] bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400" placeholder="Contoh: belanja mingguan" />
                </label>
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Tanggal</span>
                  <input type="date" required value={props.date} onChange={(event) => props.onDateChange(event.target.value)} className="w-full rounded-[20px] bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400" />
                </label>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-sm">
              <CategoryPicker type={props.type} category={props.category} categoryObjects={props.categoryObjects} onCategoryChange={props.onCategoryChange} onOpenNewCategoryModal={props.onOpenNewCategoryModal} onEditCategory={props.onEditCategory} onDeleteCategory={props.onDeleteCategory} />
            </div>

            <button type="submit" disabled={props.isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-slate-900 px-4 py-4 font-semibold text-white disabled:opacity-60">
              {props.isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              {props.mode === 'edit' ? 'Simpan perubahan' : 'Tambah transaksi'}
            </button>
          </form>

          <CategoryModal isCategoryModalOpen={props.isCategoryModalOpen} editingCategory={props.editingCategory} newCategoryName={props.newCategoryName} isSavingCategory={props.isSavingCategory} onCloseCategoryModal={props.onCloseCategoryModal} onCategoryNameChange={props.onCategoryNameChange} onSubmitCategory={props.onSubmitCategory} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
