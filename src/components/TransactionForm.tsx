import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteField } from 'firebase/firestore';
import {
  db,
  collection,
  addDoc,
  updateDoc,
  doc,
  auth,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  writeBatch,
  limit,
  deleteDoc,
} from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { isDateOnly } from '../lib/scanReceiptSchema';
import { TransactionFormView } from './TransactionFormView';
import { approvePendingCapture, createPendingCapture, findPotentialDuplicateTransactions, prepareCaptureImage, scanReceiptImage, type CaptureFields } from '../lib/transactionCapture';
import type { CategoryRecord, PendingCapture, TransactionRecord, TransactionType } from './financeTypes';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface TransactionFormProps {
  householdId: string;
  onClose: () => void;
  onNotify: (payload: { title: string; message: string }) => void;
  initialData?: TransactionRecord;
  initialCapture?: PendingCapture;
}

export const EXPENSE_CATEGORIES = [
  'Makan', 'Jajan', 'Belanja Mingguan', 'Belanja Bulanan', 'BBM Mobil', 'BBM Motor',
  'Service Kendaraan', 'Token Listrik', 'Tagihan Air', 'Internet & Pulsa',
  'Transportasi', 'Hiburan', 'Lainnya',
];

export const INCOME_CATEGORIES = ['Gaji', 'Bonus', 'Hasil Usaha', 'Investasi', 'Pemberian', 'Lainnya'];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Makan: ['makan', 'restoran', 'warung', 'nasi', 'dinner', 'lunch', 'sarapan'],
  Jajan: ['jajan', 'kopi', 'snack', 'cemilan', 'minum', 'starbucks', 'boba'],
  'Belanja Mingguan': ['belanja', 'pasar', 'supermarket', 'indomaret', 'alfamart', 'sayur'],
  'Belanja Bulanan': ['belanja bulanan', 'stok bulanan', 'kebutuhan rumah', 'sabun', 'beras', 'minyak', 'telur'],
  'BBM Mobil': ['bensin mobil', 'pertamax mobil', 'solar mobil', 'isi bensin mobil'],
  'BBM Motor': ['bensin motor', 'pertamax motor', 'bensin', 'bbm', 'isi bensin'],
  'Service Kendaraan': ['service', 'bengkel', 'oli', 'ban', 'cuci mobil', 'cuci motor'],
  'Token Listrik': ['listrik', 'token', 'pln'],
  'Tagihan Air': ['air', 'pdam'],
  'Internet & Pulsa': ['pulsa', 'kuota', 'internet', 'wifi', 'telkomsel', 'indosat', 'xl'],
  Transportasi: ['gojek', 'grab', 'ojek', 'taksi', 'bus', 'kereta', 'mrt', 'lrt'],
  Hiburan: ['nonton', 'bioskop', 'game', 'liburan', 'netflix', 'spotify'],
  Gaji: ['gaji', 'payroll', 'salary'],
  Bonus: ['bonus', 'thr', 'insentif'],
  'Hasil Usaha': ['dagang', 'jualan', 'omzet', 'laba'],
  Investasi: ['dividen', 'saham', 'crypto', 'reksadana'],
  Pemberian: ['dikasih', 'pemberian', 'hadiah', 'angpao'],
};

function toDateValue(value: string | undefined) {
  if (value && isDateOnly(value)) return value;
  const source = value ? new Date(value) : new Date();
  const year = source.getFullYear();
  const month = String(source.getMonth() + 1).padStart(2, '0');
  const day = String(source.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TransactionForm({ householdId, onClose, onNotify, initialData, initialCapture }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(initialCapture?.type || initialData?.type || 'expense');
  const initialAmount = initialCapture?.amount ?? initialData?.amount;
  const [amountStr, setAmountStr] = useState(initialAmount ? new Intl.NumberFormat('id-ID').format(initialAmount) : '');
  const [category, setCategory] = useState(initialCapture?.category || initialData?.category || '');
  const [note, setNote] = useState(initialCapture?.note ?? initialData?.note ?? '');
  const [date, setDate] = useState(() => toDateValue(initialCapture?.date || initialData?.date));
  const [isListening, setIsListening] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(initialData?.receiptImage || null);
  const [capturePreview, setCapturePreview] = useState<string | null>(null);
  const [pendingCaptureId, setPendingCaptureId] = useState<string | null>(initialCapture?.id ?? null);
  const [captureError, setCaptureError] = useState('');
  const [blockedFingerprint, setBlockedFingerprint] = useState<string | null>(null);
  const [duplicateConfirmationKey, setDuplicateConfirmationKey] = useState('');
  const [receiptScanState, setReceiptScanState] = useState<'idle' | 'selected' | 'analyzing' | 'success' | 'error'>(() => initialData?.receiptImage || initialCapture ? 'success' : 'idle');
  const [customCategories, setCustomCategories] = useState<CategoryRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [searchCategory, setSearchCategory] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isScanSourcePickerOpen, setIsScanSourcePickerOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<CategoryRecord | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const path = `households/${householdId}/categories`;
    const q = query(collection(db, path), orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const categories = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<CategoryRecord, 'id'>),
        }));
        setCustomCategories(categories);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [householdId]);

  useEffect(() => {
    const path = `households/${householdId}/transactions`;
    const q = query(collection(db, path));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<TransactionRecord, 'id'>),
        }));
        setTransactions(items);
        setTransactionsLoaded(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [householdId]);

  const defaultCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const currentCustomCategories = customCategories.filter((item) => item.type === type);
  const categoryObjects = [
    ...defaultCategories.map((name) => ({ id: name, name, isCustom: false })),
    ...currentCustomCategories.map((item) => ({ id: item.id, name: item.name, isCustom: true, record: item })),
  ].filter((item) => item.name.trim().length > 0);
  const categoryUsage = transactions.reduce<Record<string, number>>((accumulator, transaction) => {
    if (transaction.type !== type) return accumulator;
    accumulator[transaction.category] = (accumulator[transaction.category] ?? 0) + 1;
    return accumulator;
  }, {});
  const sortedCategoryObjects = [...categoryObjects].sort((left, right) => {
    const countDiff = (categoryUsage[right.name] ?? 0) - (categoryUsage[left.name] ?? 0);
    if (countDiff !== 0) return countDiff;
    return left.name.localeCompare(right.name);
  });
  useEffect(() => {
    setSearchCategory('');
    setShowAllCategories(false);
  }, [type]);

  const handleSaveCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newCategoryName.trim() || isSavingCategory) return;

    setIsSavingCategory(true);
    try {
      if (editingCategory) {
        const path = `households/${householdId}/categories/${editingCategory.id}`;
        await updateDoc(doc(db, path), { name: newCategoryName.trim() });

        const transactionPath = `households/${householdId}/transactions`;
        const transactionQuery = query(collection(db, transactionPath), where('category', '==', editingCategory.name));
        const snapshot = await getDocs(transactionQuery);

        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach((snapshotDoc) => {
            batch.update(snapshotDoc.ref, { category: newCategoryName.trim() });
          });
          await batch.commit();
        }

        if (category === editingCategory.name) {
          setCategory(newCategoryName.trim());
        }
      } else {
        const path = `households/${householdId}/categories`;
        await addDoc(collection(db, path), {
          name: newCategoryName.trim(),
          type,
          createdAt: new Date().toISOString(),
          authorUid: auth.currentUser?.uid,
        });
        setCategory(newCategoryName.trim());
        setShowAllCategories(true);
      }

      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setNewCategoryName('');
    } catch (error) {
      console.error('Failed to save category', error);
      onNotify({
        title: 'Gagal Menyimpan Kategori',
        message: 'Kategori tidak berhasil disimpan. Coba lagi beberapa saat lagi.',
      });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryToDelete: CategoryRecord) => {
    try {
      const transactionPath = `households/${householdId}/transactions`;
      const transactionQuery = query(collection(db, transactionPath), where('category', '==', categoryToDelete.name), limit(1));
      const snapshot = await getDocs(transactionQuery);

      if (!snapshot.empty) {
        onNotify({
          title: 'Kategori Tidak Bisa Dihapus',
          message: `Kategori "${categoryToDelete.name}" sudah dipakai di transaksi dan belum bisa dihapus.`,
        });
        return;
      }

      setPendingDeleteCategory(categoryToDelete);
    } catch (error) {
      console.error('Failed to delete category', error);
      onNotify({
        title: 'Gagal Menghapus Kategori',
        message: 'Kategori tidak berhasil dihapus. Coba lagi beberapa saat lagi.',
      });
    }
  };

  const confirmDeleteCategory = async () => {
    if (!pendingDeleteCategory) return;

    try {
      const path = `households/${householdId}/categories/${pendingDeleteCategory.id}`;
      await deleteDoc(doc(db, path));
      if (category === pendingDeleteCategory.name) setCategory('');
      setPendingDeleteCategory(null);
      onNotify({
        title: 'Kategori Dihapus',
        message: `Kategori "${pendingDeleteCategory.name}" berhasil dihapus.`,
      });
    } catch (error) {
      console.error('Failed to confirm delete category', error);
      onNotify({
        title: 'Gagal Menghapus Kategori',
        message: 'Kategori tidak berhasil dihapus. Coba lagi beberapa saat lagi.',
      });
    }
  };

  const parseIndonesianNumberWords = (text: string): number => {
    const words = text.toLowerCase().split(/\s+/);
    const map: Record<string, number> = {
      nol: 0, satu: 1, se: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
      enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
      sebelas: 11, belas: 10, puluh: 10, ratus: 100, ribu: 1000, juta: 1000000,
    };

    let total = 0;
    let current = 0;

    words.forEach((word) => {
      if (map[word] === undefined) return;

      const value = map[word];
      if (value === 1000000 || value === 1000) {
        if (current === 0) current = 1;
        total += current * value;
        current = 0;
      } else if (value === 100 || value === 10) {
        if (current === 0) current = 1;
        current *= value;
      } else if (word === 'belas') {
        current += 10;
      } else {
        current += value;
      }
    });

    return total + current;
  };

  const processVoiceInput = useCallback((text: string) => {
    const lowerText = text.toLowerCase();

    let amount = 0;
    const amountRegex = /(\d+[\d\.,]*)\s*(ribu|rb|juta|jt)?/i;
    const match = lowerText.match(amountRegex);

    if (match) {
      const parsedValue = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
      const multiplier = match[2]?.toLowerCase();
      amount = parsedValue;
      if (multiplier === 'ribu' || multiplier === 'rb') amount *= 1000;
      if (multiplier === 'juta' || multiplier === 'jt') amount *= 1000000;
    } else {
      amount = parseIndonesianNumberWords(lowerText);
    }

    if (amount > 0) {
      setAmountStr(new Intl.NumberFormat('id-ID').format(amount));
    }

    let foundCategory = '';
    let foundType: TransactionType = 'expense';

    for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        foundCategory = categoryName;
        foundType = INCOME_CATEGORIES.includes(categoryName) ? 'income' : 'expense';
        break;
      }
    }

    if (!foundCategory) {
      for (const customCategory of customCategories) {
        if (lowerText.includes(customCategory.name.toLowerCase())) {
          foundCategory = customCategory.name;
          foundType = customCategory.type;
          break;
        }
      }
    }

    if (foundCategory) {
      setType(foundType);
      setCategory(foundCategory);
      setNote(text);
    } else {
      setCategory('Lainnya');
      setNote(text);
    }
  }, [customCategories]);

  const startListening = () => {
    if (typeof window === 'undefined') return;

    if (!navigator.onLine) {
      onNotify({
        title: 'Tidak Ada Koneksi',
        message: 'Voice input membutuhkan koneksi internet untuk memproses suara.',
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onNotify({
        title: 'Voice Input Tidak Didukung',
        message: 'Browser ini belum mendukung voice input.',
      });
      return;
    }

    setIsListening(true);

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);

      if (event.error === 'not-allowed') {
        onNotify({
          title: 'Izin Mikrofon Ditolak',
          message: 'Berikan izin mikrofon di browser atau buka aplikasi di tab baru lalu coba lagi.',
        });
      } else if (event.error === 'network') {
        onNotify({
          title: 'Voice Input Gagal',
          message: 'Koneksi internet tidak stabil atau layanan pengenal suara sedang tidak tersedia.',
        });
      } else if (event.error !== 'no-speech') {
        onNotify({
          title: 'Voice Input Bermasalah',
          message: `Terjadi kesalahan saat memproses suara: ${event.error}.`,
        });
      }
    };
    recognition.onresult = (event: any) => processVoiceInput(event.results[0][0].transcript);

    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start recognition', error);
      setIsListening(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const rawValue = value.replace(/\D/g, '');
    if (!rawValue) {
      setAmountStr('');
      return;
    }
    setAmountStr(new Intl.NumberFormat('id-ID').format(parseInt(rawValue, 10)));
  };

  const addAmount = (addValue: number) => {
    const current = parseInt(amountStr.replace(/\D/g, '') || '0', 10);
    setAmountStr(new Intl.NumberFormat('id-ID').format(current + addValue));
  };

  const appendZeros = () => {
    if (!amountStr) return;
    const rawValue = amountStr.replace(/\D/g, '') + '000';
    setAmountStr(new Intl.NumberFormat('id-ID').format(parseInt(rawValue, 10)));
  };

  const handleScanReceipt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!auth.currentUser) {
      onNotify({
        title: 'Login Diperlukan',
        message: 'Anda harus login terlebih dahulu untuk memakai scan struk.',
      });
      return;
    }

    setIsScanSourcePickerOpen(false);
    setIsScanning(true);
    setCaptureError('');
    setBlockedFingerprint(null);
    try {
      const prepared = await prepareCaptureImage(file);
      setCapturePreview(prepared.previewDataUrl);
      setReceiptScanState('analyzing');
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Sesi login tidak valid. Silakan login ulang.');
      const categories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...customCategories.map((item) => item.name)];
      const result = await scanReceiptImage(prepared.imageBase64, await currentUser.getIdToken(), categories);
      const captureFields: CaptureFields = {
        type: result.type,
        amount: result.amount,
        category: result.category,
        note: result.note,
        date: toDateValue(result.date ?? undefined),
      };
      setType(captureFields.type);
      setAmountStr(new Intl.NumberFormat('id-ID').format(captureFields.amount));
      setCategory(captureFields.category);
      setNote(captureFields.note);
      setDate(captureFields.date);
      const captureId = await createPendingCapture(
        db,
        householdId,
        currentUser.uid,
        currentUser.displayName || '',
        captureFields,
        prepared.fingerprint,
      );
      setPendingCaptureId(captureId);
      setReceiptScanState('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memindai struk. Pastikan gambar jelas dan coba lagi.';
      setCaptureError(message);
      if (message.includes('sudah pernah') || message.includes('sudah tercatat') || (error as { code?: string })?.code === 'permission-denied') setBlockedFingerprint('duplicate');
      onNotify({ title: 'Scan Transaksi Gagal', message });
      setReceiptScanState('error');
    } finally {
      setIsScanning(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = parseInt(amountStr.replace(/\D/g, ''), 10);
    if (!numericAmount || Number.isNaN(numericAmount) || !category || !auth.currentUser || isSubmitting || blockedFingerprint) return;

    if (pendingCaptureId && !transactionsLoaded) return;

    const captureFields: CaptureFields = { type, amount: numericAmount, category, note, date: toDateValue(date) };
    const matches = pendingCaptureId ? findPotentialDuplicateTransactions(transactions, captureFields) : [];
    const confirmationKey = JSON.stringify({ fields: captureFields, matches: matches.map((item) => item.id).sort() });
    if (matches.length > 0 && duplicateConfirmationKey !== confirmationKey) {
      setDuplicateConfirmationKey(confirmationKey);
      return;
    }

    setIsSubmitting(true);
    try {
      if (initialData?.id) {
        const path = `households/${householdId}/transactions/${initialData.id}`;
        await updateDoc(doc(db, path), {
          type,
          amount: numericAmount,
          category,
          note,
          date: toDateValue(date),
          ...(receiptImage ? { receiptImage } : { receiptImage: deleteField() }),
        });
      } else if (pendingCaptureId) {
        await approvePendingCapture(
          db,
          householdId,
          pendingCaptureId,
          auth.currentUser.uid,
          auth.currentUser.displayName || '',
          captureFields,
        );
      } else {
        const path = `households/${householdId}/transactions`;
        await addDoc(collection(db, path), {
          householdId,
          type,
          amount: numericAmount,
          category,
          note,
          date: toDateValue(date),
          createdAt: new Date().toISOString(),
          authorUid: auth.currentUser.uid,
          authorName: auth.currentUser.displayName || '',
        });
      }

      onNotify({
        title: initialData?.id ? 'Transaksi Diperbarui' : 'Transaksi Dibuat',
        message: initialData?.id ? 'Perubahan transaksi berhasil disimpan.' : pendingCaptureId ? 'Capture dikonfirmasi dan masuk ke transaksi.' : 'Transaksi baru berhasil disimpan.',
      });
      onClose();
    } catch (error) {
      if (error instanceof Error && error.message.includes('sudah tercatat')) {
        setCaptureError(error.message);
        setBlockedFingerprint('duplicate');
      } else {
        handleFirestoreError(error, initialData?.id ? OperationType.UPDATE : OperationType.CREATE, initialData?.id ? `households/${householdId}/transactions/${initialData.id}` : `households/${householdId}/transactions`);
      }
      onNotify({
        title: initialData?.id ? 'Gagal Memperbarui Transaksi' : 'Gagal Membuat Transaksi',
        message: 'Data transaksi tidak berhasil disimpan. Cek isian dan coba lagi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const reviewAmount = parseInt(amountStr.replace(/\D/g, ''), 10);
  const currentCaptureFields: CaptureFields = { type, amount: reviewAmount, category, note, date: toDateValue(date) };
  const currentDuplicateMatches = pendingCaptureId && Number.isSafeInteger(reviewAmount) && reviewAmount > 0
    ? findPotentialDuplicateTransactions(transactions, currentCaptureFields)
    : [];
  const currentDuplicateKey = JSON.stringify({ fields: currentCaptureFields, matches: currentDuplicateMatches.map((item) => item.id).sort() });

  return (
    <TransactionFormView
      mode={pendingCaptureId ? 'review' : initialData ? 'edit' : 'create'}
      type={type}
      amountStr={amountStr}
      category={category}
      note={note}
      date={date}
      receiptImage={receiptImage}
      capturePreview={capturePreview}
      isPendingCapture={!!pendingCaptureId}
      captureError={captureError}
      isExactDuplicate={!!blockedFingerprint}
      duplicateMatches={currentDuplicateMatches}
      isDuplicateConfirmation={currentDuplicateMatches.length > 0 && duplicateConfirmationKey === currentDuplicateKey}
      isDuplicateCheckPending={!!pendingCaptureId && !transactionsLoaded}
      receiptScanState={receiptScanState}
      isListening={isListening}
      isScanning={isScanning}
      isScanSourcePickerOpen={isScanSourcePickerOpen}
      isSubmitting={isSubmitting}
      categoryObjects={categoryObjects}
      featuredCategoryObjects={categoryObjects}
      searchCategory={searchCategory}
      showAllCategories={showAllCategories}
      isCategoryModalOpen={isCategoryModalOpen}
      editingCategory={editingCategory}
      newCategoryName={newCategoryName}
      isSavingCategory={isSavingCategory}
      onClose={onClose}
      onTypeChange={(nextType) => {
        setType(nextType);
        setCategory('');
      }}
      onAmountChange={handleAmountChange}
      onQuickAmountAdd={addAmount}
      onAppendZeros={appendZeros}
      onCategoryChange={setCategory}
      onSearchCategoryChange={setSearchCategory}
      onToggleShowAllCategories={() => setShowAllCategories((value) => !value)}
      onOpenNewCategoryModal={() => {
        setEditingCategory(null);
        setNewCategoryName('');
        setIsCategoryModalOpen(true);
      }}
      onEditCategory={(categoryToEdit) => {
        setEditingCategory(categoryToEdit);
        setNewCategoryName(categoryToEdit.name);
        setIsCategoryModalOpen(true);
      }}
      onDeleteCategory={handleDeleteCategory}
      pendingDeleteCategory={pendingDeleteCategory}
      onCancelDeleteCategory={() => setPendingDeleteCategory(null)}
      onConfirmDeleteCategory={confirmDeleteCategory}
      onNoteChange={setNote}
      onDateChange={setDate}
      onClearReceiptImage={() => {
        setReceiptImage(null);
        setCapturePreview(null);
        setCaptureError('');
        setBlockedFingerprint(null);
        setReceiptScanState('idle');
      }}
      onStartListening={startListening}
      onOpenScanSourcePicker={() => setIsScanSourcePickerOpen(true)}
      onCloseScanSourcePicker={() => setIsScanSourcePickerOpen(false)}
      onTriggerCameraCapture={() => {
        setIsScanSourcePickerOpen(false);
        cameraInputRef.current?.click();
      }}
      onTriggerGalleryPick={() => {
        setIsScanSourcePickerOpen(false);
        galleryInputRef.current?.click();
      }}
      onReceiptFileChange={handleScanReceipt}
      onSubmit={handleSubmit}
      cameraInputRef={cameraInputRef}
      galleryInputRef={galleryInputRef}
      onCloseCategoryModal={() => setIsCategoryModalOpen(false)}
      onCategoryNameChange={setNewCategoryName}
      onSubmitCategory={handleSaveCategory}
    />
  );
}
