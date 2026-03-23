import { AnimatePresence, motion } from 'motion/react';
import { Camera, Check, Edit2, Loader2, Mic, Plus, Receipt, Trash2, X } from 'lucide-react';
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

function ActionTools({
  mode,
  isListening,
  isScanning,
  onStartListening,
  onTriggerScanReceipt,
  onReceiptFileChange,
  fileInputRef,
}: Pick<TransactionFormViewProps, 'mode' | 'isListening' | 'isScanning' | 'onStartListening' | 'onTriggerScanReceipt' | 'onReceiptFileChange' | 'fileInputRef'>) {
  if (mode === 'edit') return null;

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onStartListening} disabled={isListening || isScanning} className={cn('flex h-11 w-11 items-center justify-center rounded-[1rem] transition disabled:opacity-50', isListening ? 'bg-rose-100 text-rose-500' : 'bg-[#f7f4ff] text-violet-500 hover:bg-violet-100')} title="Input suara">
        {isListening ? (
          <>
            <Mic className="h-5 w-5" />
            <span className="absolute inset-0 animate-ping rounded-[1rem] bg-rose-300/50" />
          </>
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>
      <button type="button" onClick={onTriggerScanReceipt} disabled={isListening || isScanning} className={cn('flex h-11 w-11 items-center justify-center rounded-[1rem] transition disabled:opacity-50', isScanning ? 'bg-sky-100 text-sky-500' : 'bg-[#fff1f8] text-fuchsia-500 hover:bg-fuchsia-100')} title="Scan struk">
        {isScanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
      </button>
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={onReceiptFileChange} className="hidden" />
    </div>
  );
}

function ReceiptPreview({ receiptImage, onClearReceiptImage }: Pick<TransactionFormViewProps, 'receiptImage' | 'onClearReceiptImage'>) {
  if (!receiptImage) return null;

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/80 shadow-[0_10px_30px_rgba(125,104,196,0.08)]">
      <img src={receiptImage} alt="Struk" className="h-36 w-full object-cover" />
      <button type="button" onClick={onClearReceiptImage} className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-rose-500 shadow transition hover:bg-rose-50">
        <X className="h-4 w-4" />
      </button>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-white"><Check className="h-4 w-4 text-emerald-300" /> Struk berhasil dipindai</p>
      </div>
    </div>
  );
}

function CategoryPicker({
  type,
  category,
  categoryObjects,
  onCategoryChange,
  onOpenNewCategoryModal,
  onEditCategory,
  onDeleteCategory,
}: Pick<TransactionFormViewProps, 'type' | 'category' | 'categoryObjects' | 'onCategoryChange' | 'onOpenNewCategoryModal' | 'onEditCategory' | 'onDeleteCategory'>) {
  return (
    <div className="space-y-3">
      <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Kategori</label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {categoryObjects.map((item) => (
          <div key={item.id} className="group relative">
            <label className={cn('flex min-h-[3.5rem] cursor-pointer items-center justify-center rounded-[1.15rem] px-3 py-3 text-center text-sm font-medium transition', category === item.name ? type === 'income' ? 'bg-emerald-50 text-emerald-600 ring-2 ring-emerald-200' : 'bg-[#fff1f8] text-fuchsia-500 ring-2 ring-fuchsia-200' : 'bg-[#faf8ff] text-[color:var(--moni-subtle)] hover:bg-violet-100')}>
              <input type="radio" name="category" value={item.name} checked={category === item.name} onChange={() => onCategoryChange(item.name)} className="hidden" required />
              <span className="line-clamp-2">{item.name}</span>
            </label>
            {item.isCustom && item.record && (
              <div className="absolute -right-1 -top-1 z-10 hidden gap-1 group-hover:flex">
                <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onEditCategory(item.record!); }} className="rounded-full bg-sky-100 p-1.5 text-sky-500 shadow-sm transition hover:bg-sky-200">
                  <Edit2 className="h-3 w-3" />
                </button>
                <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onDeleteCategory(item.record!); }} className="rounded-full bg-rose-100 p-1.5 text-rose-500 shadow-sm transition hover:bg-rose-200">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
        <button type="button" onClick={onOpenNewCategoryModal} className="flex min-h-[3.5rem] items-center justify-center gap-2 rounded-[1.15rem] border border-dashed border-violet-200 bg-white/70 text-sm font-medium text-violet-500 transition hover:bg-violet-50">
          <Plus className="h-4 w-4" /> Tambah
        </button>
      </div>
    </div>
  );
}

function CategoryModal({
  isCategoryModalOpen,
  editingCategory,
  newCategoryName,
  isSavingCategory,
  onCloseCategoryModal,
  onCategoryNameChange,
  onSubmitCategory,
}: Pick<TransactionFormViewProps, 'isCategoryModalOpen' | 'editingCategory' | 'newCategoryName' | 'isSavingCategory' | 'onCloseCategoryModal' | 'onCategoryNameChange' | 'onSubmitCategory'>) {
  return (
    <AnimatePresence>
      {isCategoryModalOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-sm rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_24px_60px_rgba(84,64,150,0.24)]">
            <h3 className="text-lg font-semibold tracking-tight text-[color:var(--moni-text)]">{editingCategory ? 'Edit kategori' : 'Tambah kategori baru'}</h3>
            <form onSubmit={onSubmitCategory} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Nama kategori</label>
                <input type="text" required autoFocus value={newCategoryName} onChange={(event) => onCategoryNameChange(event.target.value)} className="moni-input" placeholder="Contoh: Cicilan Motor" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onCloseCategoryModal} className="flex-1 rounded-[1.25rem] bg-slate-100 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-200">Batal</button>
                <button type="submit" disabled={!newCategoryName.trim() || isSavingCategory} className="moni-primary-button flex-1 justify-center">
                  {isSavingCategory ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'Simpan'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function TransactionFormView(props: TransactionFormViewProps) {
  const title = props.mode === 'edit' ? 'Edit transaksi' : 'Transaksi baru';

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 p-4 backdrop-blur-sm sm:items-center">
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 24, stiffness: 220 }} className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-[0_24px_60px_rgba(84,64,150,0.24)]">
          <div className="moni-hero relative overflow-hidden px-6 py-5 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(255,207,111,0.24),transparent_30%)]" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">Input cepat</p>
                <h2 className="mt-2 text-[1.9rem] font-semibold tracking-tight">{title}</h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-white/80">Catat seperlunya saja. Detail lain tetap ada kalau kamu butuh.</p>
              </div>
              <div className="flex items-center gap-2">
                <ActionTools
                  mode={props.mode}
                  isListening={props.isListening}
                  isScanning={props.isScanning}
                  onStartListening={props.onStartListening}
                  onTriggerScanReceipt={props.onTriggerScanReceipt}
                  onReceiptFileChange={props.onReceiptFileChange}
                  fileInputRef={props.fileInputRef}
                />
                <button onClick={props.onClose} className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={props.onSubmit} className="space-y-6 overflow-y-auto p-6">
            <div className="relative grid grid-cols-2 rounded-[1.4rem] bg-[#f7f4ff] p-1">
              <div className={cn('absolute inset-y-1 w-[calc(50%-4px)] rounded-[1.1rem] bg-white shadow-[0_10px_20px_rgba(125,104,196,0.08)] transition-all duration-300', props.type === 'income' ? 'left-1' : 'left-[calc(50%+2px)]')} />
              <button type="button" onClick={() => props.onTypeChange('income')} className={cn('relative z-10 rounded-[1.1rem] px-4 py-3 text-sm font-semibold transition', props.type === 'income' ? 'text-emerald-500' : 'text-[color:var(--moni-subtle)]')}>
                Pemasukan
              </button>
              <button type="button" onClick={() => props.onTypeChange('expense')} className={cn('relative z-10 rounded-[1.1rem] px-4 py-3 text-sm font-semibold transition', props.type === 'expense' ? 'text-fuchsia-500' : 'text-[color:var(--moni-subtle)]')}>
                Pengeluaran
              </button>
            </div>

            <ReceiptPreview receiptImage={props.receiptImage} onClearReceiptImage={props.onClearReceiptImage} />

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Jumlah</label>
                <div className="rounded-[1.5rem] bg-[#f7f4ff] p-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-lg font-semibold text-violet-400">Rp</span>
                    <input type="tel" required value={props.amountStr} onChange={(event) => props.onAmountChange(event.target.value)} className="w-full bg-transparent text-3xl font-semibold tracking-tight text-[color:var(--moni-text)] outline-none" placeholder="0" />
                  </div>
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                    {[10000, 50000, 100000].map((value) => (
                      <button key={value} type="button" onClick={() => props.onQuickAmountAdd(value)} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[color:var(--moni-subtle)] shadow-[0_6px_18px_rgba(125,104,196,0.08)] transition hover:-translate-y-0.5">
                        +{value === 10000 ? '10rb' : value === 50000 ? '50rb' : '100rb'}
                      </button>
                    ))}
                    <button type="button" onClick={props.onAppendZeros} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[color:var(--moni-subtle)] shadow-[0_6px_18px_rgba(125,104,196,0.08)] transition hover:-translate-y-0.5">+000</button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Catatan</label>
                <input type="text" value={props.note} onChange={(event) => props.onNoteChange(event.target.value)} className="moni-input" placeholder="Contoh: kopi pagi, transfer klien" />
              </div>
              <div className="space-y-2">
                <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Tanggal</label>
                <input type="date" required value={props.date} onChange={(event) => props.onDateChange(event.target.value)} className="moni-input" />
              </div>
            </section>

            <CategoryPicker
              type={props.type}
              category={props.category}
              categoryObjects={props.categoryObjects}
              onCategoryChange={props.onCategoryChange}
              onOpenNewCategoryModal={props.onOpenNewCategoryModal}
              onEditCategory={props.onEditCategory}
              onDeleteCategory={props.onDeleteCategory}
            />

            <button type="submit" disabled={props.isSubmitting} className="moni-primary-button w-full justify-center py-4 text-base">
              {props.isSubmitting ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <><Check className="h-5 w-5" /> Simpan transaksi</>}
            </button>
          </form>
        </motion.div>
      </motion.div>

      <CategoryModal
        isCategoryModalOpen={props.isCategoryModalOpen}
        editingCategory={props.editingCategory}
        newCategoryName={props.newCategoryName}
        isSavingCategory={props.isSavingCategory}
        onCloseCategoryModal={props.onCloseCategoryModal}
        onCategoryNameChange={props.onCategoryNameChange}
        onSubmitCategory={props.onSubmitCategory}
      />
    </AnimatePresence>
  );
}
