import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, Camera, Calendar, Check, ChevronDown, ChevronUp, Edit2, Loader2, Mic, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
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
  receiptScanState: 'idle' | 'selected' | 'analyzing' | 'success' | 'error';
  isListening: boolean;
  isScanning: boolean;
  isSubmitting: boolean;
  categoryObjects: CategoryOption[];
  featuredCategoryObjects: CategoryOption[];
  searchCategory: string;
  showAllCategories: boolean;
  isScanSourcePickerOpen: boolean;
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
  onSearchCategoryChange: (value: string) => void;
  onToggleShowAllCategories: () => void;
  onOpenNewCategoryModal: () => void;
  onEditCategory: (category: CategoryRecord) => void;
  onDeleteCategory: (category: CategoryRecord) => void;
  onNoteChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onClearReceiptImage: () => void;
  onStartListening: () => void;
  onOpenScanSourcePicker: () => void;
  onCloseScanSourcePicker: () => void;
  onTriggerCameraCapture: () => void;
  onTriggerGalleryPick: () => void;
  onReceiptFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  onCloseCategoryModal: () => void;
  onCategoryNameChange: (value: string) => void;
  onSubmitCategory: (event: React.FormEvent<HTMLFormElement>) => void;
}

function VoiceScanActions({
  mode,
  isListening,
  isScanning,
  isScanSourcePickerOpen,
  onStartListening,
  onOpenScanSourcePicker,
  onCloseScanSourcePicker,
  onTriggerCameraCapture,
  onTriggerGalleryPick,
  onReceiptFileChange,
  cameraInputRef,
  galleryInputRef,
}: Pick<TransactionFormViewProps, 'mode' | 'isListening' | 'isScanning' | 'isScanSourcePickerOpen' | 'onStartListening' | 'onOpenScanSourcePicker' | 'onCloseScanSourcePicker' | 'onTriggerCameraCapture' | 'onTriggerGalleryPick' | 'onReceiptFileChange' | 'cameraInputRef' | 'galleryInputRef'>) {
  if (mode === 'edit') {
    return null;
  }

  return (
    <>
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
          onClick={onOpenScanSourcePicker}
          disabled={isListening || isScanning}
          className={cn(
            'relative rounded-full p-2 transition-all disabled:opacity-50',
            isScanning ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          )}
          title="Scan Struk"
        >
          {isScanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </button>
        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={onReceiptFileChange} className="hidden" />
        <input type="file" accept="image/*" ref={galleryInputRef} onChange={onReceiptFileChange} className="hidden" />
      </div>

      <AnimatePresence>
        {isScanSourcePickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
            onClick={onCloseScanSourcePicker}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3">
                <p className="text-sm font-semibold text-slate-900">Tambahkan foto struk</p>
                <p className="mt-1 text-xs text-slate-500">Pilih sumber gambar seperti di aplikasi native.</p>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onTriggerCameraCapture}
                  className="flex w-full items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  <Camera className="h-4 w-4 text-slate-500" />
                  Ambil foto
                </button>
                <button
                  type="button"
                  onClick={onTriggerGalleryPick}
                  className="flex w-full items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  <Upload className="h-4 w-4 text-slate-500" />
                  Pilih dari galeri
                </button>
                <button
                  type="button"
                  onClick={onCloseScanSourcePicker}
                  className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ReceiptPreview({
  receiptImage,
  receiptScanState,
  onClearReceiptImage,
}: Pick<TransactionFormViewProps, 'receiptImage' | 'receiptScanState' | 'onClearReceiptImage'>) {
  if (!receiptImage) {
    return null;
  }

  const statusConfig = {
    selected: {
      icon: <Upload className="h-3 w-3 text-sky-300" />,
      message: 'Gambar struk sudah dipilih',
    },
    analyzing: {
      icon: <Loader2 className="h-3 w-3 animate-spin text-amber-300" />,
      message: 'Sedang menganalisa struk...',
    },
    success: {
      icon: <Check className="h-3 w-3 text-emerald-400" />,
      message: 'Analisa struk selesai',
    },
    error: {
      icon: <AlertCircle className="h-3 w-3 text-rose-300" />,
      message: 'Analisa gagal, gambar masih bisa dipakai',
    },
    idle: {
      icon: <Upload className="h-3 w-3 text-sky-300" />,
      message: 'Gambar struk sudah dipilih',
    },
  }[receiptScanState];

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
          {statusConfig.icon} {statusConfig.message}
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
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | undefined>();
  const selectedDate = date ? parseISO(date) : undefined;
  const dateLabel = date ? format(selectedDate ?? parseISO(date), 'd MMM yyyy', { locale: id }) : 'Pilih tanggal';

  const openDatePicker = () => {
    setDraftDate(selectedDate);
    setIsDatePickerOpen(true);
  };

  const applyDate = (nextDate: Date | undefined) => {
    if (!nextDate) {
      return;
    }

    onDateChange(format(nextDate, 'yyyy-MM-dd'));
    setIsDatePickerOpen(false);
  };

  return (
    <>
      <div className="space-y-1.5">
        <label className="px-1 text-sm font-medium text-slate-600">Tanggal</label>
        <button
          type="button"
          onClick={openDatePicker}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
        >
          <span className="truncate">{dateLabel}</span>
          <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </div>

      <AnimatePresence>
        {isDatePickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 px-3 pb-3 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setIsDatePickerOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl sm:rounded-3xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tanggal transaksi</p>
                  <h3 className="text-lg font-bold text-slate-950">Pilih tanggal</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-4">
                <div className="rounded-3xl border border-slate-100 p-2">
                  <DayPicker
                    mode="single"
                    selected={draftDate ?? selectedDate}
                    onSelect={setDraftDate}
                    locale={id}
                    captionLayout="dropdown"
                    className="finance-date-picker"
                    disabled={{ after: new Date() }}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(false)}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDate(draftDate ?? selectedDate)}
                    className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-200/70 transition hover:bg-slate-800"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CategoryPicker({
  type,
  category,
  categoryObjects,
  featuredCategoryObjects,
  searchCategory,
  showAllCategories,
  onCategoryChange,
  onSearchCategoryChange,
  onToggleShowAllCategories,
  onOpenNewCategoryModal,
  onEditCategory,
  onDeleteCategory,
}: Pick<TransactionFormViewProps, 'type' | 'category' | 'categoryObjects' | 'featuredCategoryObjects' | 'searchCategory' | 'showAllCategories' | 'onCategoryChange' | 'onSearchCategoryChange' | 'onToggleShowAllCategories' | 'onOpenNewCategoryModal' | 'onEditCategory' | 'onDeleteCategory'>) {
  const shouldShowSearch = showAllCategories || searchCategory.trim().length > 0 || categoryObjects.length > 12;
  const normalizedSearch = searchCategory.trim().toLowerCase();
  const visibleCategoryObjects = normalizedSearch
    ? categoryObjects.filter((item) => item.name.toLowerCase().includes(normalizedSearch))
    : showAllCategories
      ? categoryObjects
      : featuredCategoryObjects;
  const isShowingFeaturedOnly = !showAllCategories && !normalizedSearch;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="px-1 text-sm font-medium text-slate-600">Kategori</label>
        {categoryObjects.length > featuredCategoryObjects.length && (
          <button
            type="button"
            onClick={onToggleShowAllCategories}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-200"
          >
            {showAllCategories ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showAllCategories ? 'Sembunyikan' : `Lihat semua (${categoryObjects.length})`}
          </button>
        )}
      </div>

      {shouldShowSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchCategory}
            onChange={(event) => onSearchCategoryChange(event.target.value)}
            placeholder="Cari kategori..."
            className="w-full rounded-2xl border-none bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 transition-shadow focus:ring-2 focus:ring-slate-900"
          />
        </div>
      )}

      {isShowingFeaturedOnly && featuredCategoryObjects.length > 0 && (
        <p className="px-1 text-[11px] text-slate-500">Kategori yang paling sering dipakai ditampilkan dulu biar input lebih cepat.</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {visibleCategoryObjects.map((categoryItem) => (
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
        {visibleCategoryObjects.length === 0 && (
          <div className="col-span-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Kategori tidak ditemukan.
          </div>
        )}
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center">
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">Moni</p>
                <h2 className="text-xl font-bold tracking-tight text-slate-950">{title}</h2>
              </div>
              <VoiceScanActions
                mode={props.mode}
                isListening={props.isListening}
                isScanning={props.isScanning}
                isScanSourcePickerOpen={props.isScanSourcePickerOpen}
                onStartListening={props.onStartListening}
                onOpenScanSourcePicker={props.onOpenScanSourcePicker}
                onCloseScanSourcePicker={props.onCloseScanSourcePicker}
                onTriggerCameraCapture={props.onTriggerCameraCapture}
                onTriggerGalleryPick={props.onTriggerGalleryPick}
                onReceiptFileChange={props.onReceiptFileChange}
                cameraInputRef={props.cameraInputRef}
                galleryInputRef={props.galleryInputRef}
              />
            </div>
            <button onClick={props.onClose} className="rounded-full bg-slate-100 p-2 transition-colors hover:bg-slate-200">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={props.onSubmit} className="space-y-6 overflow-y-auto px-5 py-5">
            <div className="relative flex rounded-2xl bg-slate-100 p-1">
              <div className={cn('absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm transition-all duration-300 ease-in-out', props.type === 'income' ? 'left-1' : 'left-[calc(50%+2px)]')} />
              <button type="button" onClick={() => props.onTypeChange('income')} className={cn('z-10 flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors', props.type === 'income' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700')}>
                <ArrowDownRight className="h-4 w-4" />
                <span>Pemasukan</span>
              </button>
              <button type="button" onClick={() => props.onTypeChange('expense')} className={cn('z-10 flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors', props.type === 'expense' ? 'text-rose-600' : 'text-slate-500 hover:text-slate-700')}>
                <ArrowUpRight className="h-4 w-4" />
                <span>Pengeluaran</span>
              </button>
            </div>

            <ReceiptPreview receiptImage={props.receiptImage} receiptScanState={props.receiptScanState} onClearReceiptImage={props.onClearReceiptImage} />

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
              featuredCategoryObjects={props.featuredCategoryObjects}
              searchCategory={props.searchCategory}
              showAllCategories={props.showAllCategories}
              onCategoryChange={props.onCategoryChange}
              onSearchCategoryChange={props.onSearchCategoryChange}
              onToggleShowAllCategories={props.onToggleShowAllCategories}
              onOpenNewCategoryModal={props.onOpenNewCategoryModal}
              onEditCategory={props.onEditCategory}
              onDeleteCategory={props.onDeleteCategory}
            />

            <button type="submit" disabled={props.isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-lg font-semibold text-white shadow-lg shadow-slate-900/15 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70">
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
