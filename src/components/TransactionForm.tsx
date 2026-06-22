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
import { TransactionFormView } from './TransactionFormView';
import type { CategoryRecord, TransactionRecord, TransactionType } from './financeTypes';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface TransactionFormProps {
  householdId: string;
  onClose: () => void;
  initialData?: TransactionRecord;
}

const EXPENSE_CATEGORIES = [
  'Makan', 'Jajan', 'Belanja Mingguan', 'BBM Mobil', 'BBM Motor',
  'Service Kendaraan', 'Token Listrik', 'Tagihan Air', 'Internet & Pulsa',
  'Transportasi', 'Hiburan', 'Lainnya',
];

const INCOME_CATEGORIES = ['Gaji', 'Bonus', 'Hasil Usaha', 'Investasi', 'Pemberian', 'Lainnya'];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Makan: ['makan', 'restoran', 'warung', 'nasi', 'dinner', 'lunch', 'sarapan'],
  Jajan: ['jajan', 'kopi', 'snack', 'cemilan', 'minum', 'starbucks', 'boba'],
  'Belanja Mingguan': ['belanja', 'pasar', 'supermarket', 'indomaret', 'alfamart', 'sayur'],
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

function toDateTimeLocalValue(value: string | undefined) {
  const source = value ? new Date(value) : new Date();
  const timezoneOffset = source.getTimezoneOffset();
  const localDate = new Date(source.getTime() - timezoneOffset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function TransactionForm({ householdId, onClose, initialData }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [amountStr, setAmountStr] = useState(initialData?.amount ? new Intl.NumberFormat('id-ID').format(initialData.amount) : '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [date, setDate] = useState(() => toDateTimeLocalValue(initialData?.date));
  const [isListening, setIsListening] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(initialData?.receiptImage || null);
  const [receiptScanState, setReceiptScanState] = useState<'idle' | 'selected' | 'analyzing' | 'success' | 'error'>(() => initialData?.receiptImage ? 'success' : 'idle');
  const [customCategories, setCustomCategories] = useState<CategoryRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [searchCategory, setSearchCategory] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isScanSourcePickerOpen, setIsScanSourcePickerOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
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
  ];
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
  const featuredCategoryObjects = Array.from(
    new Map(
      [
        ...(category ? sortedCategoryObjects.filter((item) => item.name === category) : []),
        ...sortedCategoryObjects,
        ...(category ? categoryObjects.filter((item) => item.name === category) : []),
      ].map((item) => [item.id, item])
    ).values()
  ).slice(0, 8);

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
      alert('Gagal menyimpan kategori.');
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
        alert(`Kategori "${categoryToDelete.name}" tidak bisa dihapus karena sudah digunakan pada transaksi.`);
        return;
      }

      if (confirm(`Hapus kategori "${categoryToDelete.name}"?`)) {
        const path = `households/${householdId}/categories/${categoryToDelete.id}`;
        await deleteDoc(doc(db, path));
        if (category === categoryToDelete.name) setCategory('');
      }
    } catch (error) {
      console.error('Failed to delete category', error);
      alert('Gagal menghapus kategori.');
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
      alert('Anda sedang offline. Fitur Voice Input membutuhkan koneksi internet untuk memproses suara.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Browser Anda tidak mendukung Voice Input.');
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
        alert('Izin mikrofon ditolak. Pastikan Anda memberikan izin akses mikrofon di browser atau buka aplikasi di tab baru jika masih bermasalah.');
      } else if (event.error === 'network') {
        alert('Gagal terhubung ke layanan pengenal suara (Network Error). \n\nHal ini biasanya terjadi karena:\n1. Koneksi internet tidak stabil.\n2. Layanan pengenalan suara Google sedang sibuk atau diblokir oleh jaringan Anda.\n\nSilakan coba lagi dalam beberapa saat atau gunakan input manual.');
      } else if (event.error !== 'no-speech') {
        alert(`Terjadi kesalahan pada Voice Input: ${event.error}`);
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
      alert('Anda harus login terlebih dahulu untuk memakai scan struk.');
      return;
    }

    setIsScanSourcePickerOpen(false);
    setIsScanning(true);
    try {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas context');

      const MAX_SIZE = 800;
      let width = image.width;
      let height = image.height;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else if (height > MAX_SIZE) {
        width *= MAX_SIZE / height;
        height = MAX_SIZE;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      const base64DataUrl = canvas.toDataURL('image/jpeg', 0.6);
      const base64Data = base64DataUrl.split(',')[1];
      setReceiptImage(base64DataUrl);
      setReceiptScanState('analyzing');
      URL.revokeObjectURL(objectUrl);
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          categories: [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...customCategories.map((item) => item.name)],
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Gagal menganalisa struk');
      }

      if (result.amount) setAmountStr(new Intl.NumberFormat('id-ID').format(result.amount));
      if (result.category) {
        setCategory(result.category);
        setType(INCOME_CATEGORIES.includes(result.category) ? 'income' : 'expense');
      }
      if (result.note) setNote(result.note);
      setReceiptScanState('success');
    } catch (error) {
      console.error('Error scanning receipt:', error);
      const message = error instanceof Error ? error.message : 'Gagal memindai struk. Pastikan gambar jelas dan coba lagi.';
      alert(message);
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
    if (!numericAmount || Number.isNaN(numericAmount) || !category || !auth.currentUser || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (initialData?.id) {
        const path = `households/${householdId}/transactions/${initialData.id}`;
        try {
          await updateDoc(doc(db, path), {
            type,
            amount: numericAmount,
            category,
            note,
            date: new Date(date).toISOString(),
            ...(receiptImage ? { receiptImage } : { receiptImage: deleteField() }),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, path);
        }
      } else {
        const path = `households/${householdId}/transactions`;
        try {
          await addDoc(collection(db, path), {
            householdId,
            type,
            amount: numericAmount,
            category,
            note,
            date: new Date(date).toISOString(),
            createdAt: new Date().toISOString(),
            authorUid: auth.currentUser.uid,
            authorName: auth.currentUser.displayName || auth.currentUser.email || '',
            ...(receiptImage && { receiptImage }),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, path);
        }
      }
      onClose();
    } catch (error) {
      console.error('Failed to save transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TransactionFormView
      mode={initialData ? 'edit' : 'create'}
      type={type}
      amountStr={amountStr}
      category={category}
      note={note}
      date={date}
      receiptImage={receiptImage}
      receiptScanState={receiptScanState}
      isListening={isListening}
      isScanning={isScanning}
      isScanSourcePickerOpen={isScanSourcePickerOpen}
      isSubmitting={isSubmitting}
      categoryObjects={categoryObjects}
      featuredCategoryObjects={featuredCategoryObjects}
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
      onNoteChange={setNote}
      onDateChange={setDate}
      onClearReceiptImage={() => {
        setReceiptImage(null);
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
