import { AnimatePresence, motion } from 'motion/react';
import { Camera, Check, Edit2, Loader2, Mic, Plus, Trash2, X } from 'lucide-react';
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

function VoiceScanActions({
  mode,
  isListening,
  isScanning,
  onStartListening,
  onTriggerScanReceipt,
  onReceiptFileChange,
  fileInputRef,
}: Pick<TransactionFormViewProps, 'mode' | 'isListening' | 'isScanning' | 'onStartListening' | 'onTriggerScanReceipt' | 'onReceiptFileChange' | 'fileInputRef'>) {
  if (mode === 'edit') {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onStartListening}
        disabled={isListening || isScanning}
        className={cn(
          'relative rounded-full p-2 transition-all disabled:opacity-50',
          isListening ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        )}
        title="Input Suara"
      >
        {isListening ? (
          <>
            <Mic className="h-5 w-5" />
            <span className="absolute inset-0 animate-ping rounded-full bg-rose-400 opacity-25" />
          </>
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>

      <button
        type="button"
        onClick={onTriggerScanReceipt}
        disabled={isListening || isScanning}
        className={cn(
          'relative rounded-full p-2 transition-all disabled:opacity-50',
          isScanning ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        )}
        title="Scan Struk"
      >
        {isScanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
      </button>
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={onReceiptFileChange} className="hidden" />
    </div>
  );
}

function ReceiptPreview({ receiptImage, onClearReceiptImage }: Pick<TransactionFormViewProps, 'receiptImage' | 'onClearReceiptImage'>) {
  if (!receiptImage) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <img src={receiptImage} alt="Struk" className="h-32 w-full object-cover opacity-80" />
      <button
        type="button"
        onClick={onClearReceiptImage}
        className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-rose-500 shadow-sm transition-colors hover:bg-rose-50"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3">
        <p className="flex items-center gap-1 text-xs font-medium text-white">
          <Check className="h-3 w-3 text-emerald-400" /> Struk berhasil dipindai
        </p>
      </div>
    </div>
  );
}

function BasicInputSection({
  amountStr,
  note,
  date,
  onAmountChange,
  onQuickAmountAdd,
  onAppendZeros,
  onNoteChange,
  onDateChange,
}: Pick<TransactionFormViewProps, 'amountStr' | 'note' | 'date' | 'onAmountChange' | 'onQuickAmountAdd' | 'onAppendZeros' | 'onNoteChange' | 'onDateChange'>) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="px-1 text-sm font-medium text-slate-600">Jumlah</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-slate-400">Rp</span>
          <input
            type="tel"
            required
            value={amountStr}
            onChange={(event) => onAmountChange(event.target.value)}
            className="w-full rounded-2xl border-none bg-slate-50 py-4 pl-12 pr-4 text-lg font-semibold text-slate-900 transition-shadow focus:ring-2 focus:ring-slate-900"
            placeholder="0"
          />
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <button type="button" onClick={() => onQuickAmountAdd(10000)} className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-200 active:scale-95">+10rb</button>
          <button type="button" onClick={() => onQuickAmountAdd(50000)} className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-200 active:scale-95">+50rb</button>
          <button type="button" onClick={() => onQuickAmountAdd(100000)} className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-200 active:scale-95">+100rb</button>
          <button type="button" onClick={onAppendZeros} className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-200 active:scale-95">+000</button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="px-1 text-sm font-medium text-slate-600">Catatan (Opsional)</label>
        <input
          type="text"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          className="w-full rounded-2xl border-none bg-slate-50 px-4 py-4 text-slate-900 transition-shadow focus:ring-2 focus:ring-slate-900"
          placeholder="Tambah catatan..."
        />
      </div>

      <div className="space-y-1.5">
        <label className="px-1 text-sm font-medium text-slate-600">Tanggal</label>
        <input
          type="date"
          required
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
          className="w-full rounded-2xl border-none bg-slate-50 px-4 py-4 text-slate-900 transition-shadow focus:ring-2 focus:ring-slate-900"
        />
      </div>
    </>
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
    <div className="space-y-2">
      <label className="px-1 text-sm font-medium text-slate-600">Kategori</label>
      <div className="grid grid-cols-3 gap-2">
        {categoryObjects.map((categoryItem) => (
          <div key={categoryItem.id} className="group relative">
            <label
              className={cn(
                'flex h-full min-h-[3rem] cursor-pointer select-none items-center justify-center rounded-xl border px-1 py-3 text-center text-xs font-medium transition-all',
                category === categoryItem.name
                  ? type === 'income'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <input
                type="radio"
                name="category"
                value={categoryItem.name}
                checked={category === categoryItem.name}
                onChange={() => onCategoryChange(categoryItem.name)}
                className="hidden"
                required
              />
              <span className="line-clamp-2 flex-1 px-1">{categoryItem.name}</span>
            </label>
            {categoryItem.isCustom && (
              <div className="absolute -right-2 -top-2 z-10 hidden gap-1 group-hover:flex">
                <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (categoryItem.record) onEditCategory(categoryItem.record); }} className="rounded-full bg-blue-100 p-1.5 text-blue-600 shadow-sm transition-colors hover:bg-blue-200">
                  <Edit2 className="h-3 w-3" />
                </button>
                <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (categoryItem.record) onDeleteCategory(categoryItem.record); }} className="rounded-full bg-rose-100 p-1.5 text-rose-600 shadow-sm transition-colors hover:bg-rose-200">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
        <button type="button" onClick={onOpenNewCategoryModal} className="flex h-full min-h-[3rem] select-none items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 px-1 py-3 text-center text-xs font-medium text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700">
          <Plus className="h-3.5 w-3.5" /> Tambah
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-slate-900">{editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
            <form onSubmit={onSubmitCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="px-1 text-sm font-medium text-slate-600">Nama Kategori</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCategoryName}
                  onChange={(event) => onCategoryNameChange(event.target.value)}
                  className="w-full rounded-xl border-none bg-slate-50 px-4 py-3 text-slate-900 transition-shadow focus:ring-2 focus:ring-slate-900"
                  placeholder="Contoh: Cicilan Motor"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onCloseCategoryModal} className="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-200">Batal</button>
                <button type="submit" disabled={!newCategoryName.trim() || isSavingCategory} className="flex flex-1 items-center justify-center rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
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
  const title = props.mode === 'edit' ? 'Edit Transaksi' : 'Transaksi Baru';

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
              <VoiceScanActions
                mode={props.mode}
                isListening={props.isListening}
                isScanning={props.isScanning}
                onStartListening={props.onStartListening}
                onTriggerScanReceipt={props.onTriggerScanReceipt}
                onReceiptFileChange={props.onReceiptFileChange}
                fileInputRef={props.fileInputRef}
              />
            </div>
            <button onClick={props.onClose} className="rounded-full bg-slate-100 p-2 transition-colors hover:bg-slate-200">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={props.onSubmit} className="space-y-6 overflow-y-auto p-6">
            <div className="relative flex rounded-2xl bg-slate-100 p-1">
              <div className={cn('absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm transition-all duration-300 ease-in-out', props.type === 'income' ? 'left-1' : 'left-[calc(50%+2px)]')} />
              <button type="button" onClick={() => props.onTypeChange('income')} className={cn('z-10 flex-1 py-3 text-sm font-medium transition-colors', props.type === 'income' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700')}>
                Pemasukan
              </button>
              <button type="button" onClick={() => props.onTypeChange('expense')} className={cn('z-10 flex-1 py-3 text-sm font-medium transition-colors', props.type === 'expense' ? 'text-rose-600' : 'text-slate-500 hover:text-slate-700')}>
                Pengeluaran
              </button>
            </div>

            <ReceiptPreview receiptImage={props.receiptImage} onClearReceiptImage={props.onClearReceiptImage} />

            <BasicInputSection
              amountStr={props.amountStr}
              note={props.note}
              date={props.date}
              onAmountChange={props.onAmountChange}
              onQuickAmountAdd={props.onQuickAmountAdd}
              onAppendZeros={props.onAppendZeros}
              onNoteChange={props.onNoteChange}
              onDateChange={props.onDateChange}
            />

            <CategoryPicker
              type={props.type}
              category={props.category}
              categoryObjects={props.categoryObjects}
              onCategoryChange={props.onCategoryChange}
              onOpenNewCategoryModal={props.onOpenNewCategoryModal}
              onEditCategory={props.onEditCategory}
              onDeleteCategory={props.onDeleteCategory}
            />

            <button type="submit" disabled={props.isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-lg font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70">
              {props.isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Simpan Transaksi
                </>
              )}
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
