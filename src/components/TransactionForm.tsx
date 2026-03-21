import { useState, useEffect, useCallback } from 'react';
import { db, collection, addDoc, updateDoc, doc, auth, onSnapshot, query, orderBy, where, getDocs, writeBatch, limit, deleteDoc } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Mic, Plus, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface TransactionFormProps {
  householdId: string;
  onClose: () => void;
  initialData?: any;
}

const EXPENSE_CATEGORIES = [
  'Makan', 'Jajan', 'Belanja Mingguan', 'BBM Mobil', 'BBM Motor',
  'Service Kendaraan', 'Token Listrik', 'Tagihan Air', 'Internet & Pulsa',
  'Transportasi', 'Hiburan', 'Lainnya'
];

const INCOME_CATEGORIES = [
  'Gaji', 'Bonus', 'Hasil Usaha', 'Investasi', 'Pemberian', 'Lainnya'
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Makan': ['makan', 'restoran', 'warung', 'nasi', 'dinner', 'lunch', 'sarapan'],
  'Jajan': ['jajan', 'kopi', 'snack', 'cemilan', 'minum', 'starbucks', 'boba'],
  'Belanja Mingguan': ['belanja', 'pasar', 'supermarket', 'indomaret', 'alfamart', 'sayur'],
  'BBM Mobil': ['bensin mobil', 'pertamax mobil', 'solar mobil', 'isi bensin mobil'],
  'BBM Motor': ['bensin motor', 'pertamax motor', 'bensin', 'bbm', 'isi bensin'],
  'Service Kendaraan': ['service', 'bengkel', 'oli', 'ban', 'cuci mobil', 'cuci motor'],
  'Token Listrik': ['listrik', 'token', 'pln'],
  'Tagihan Air': ['air', 'pdam'],
  'Internet & Pulsa': ['pulsa', 'kuota', 'internet', 'wifi', 'telkomsel', 'indosat', 'xl'],
  'Transportasi': ['gojek', 'grab', 'ojek', 'taksi', 'bus', 'kereta', 'mrt', 'lrt'],
  'Hiburan': ['nonton', 'bioskop', 'game', 'liburan', 'netflix', 'spotify'],
  'Gaji': ['gaji', 'payroll', 'salary'],
  'Bonus': ['bonus', 'thr', 'insentif'],
  'Hasil Usaha': ['dagang', 'jualan', 'omzet', 'laba'],
  'Investasi': ['dividen', 'saham', 'crypto', 'reksadana'],
  'Pemberian': ['dikasih', 'pemberian', 'hadiah', 'angpao']
};

export function TransactionForm({ householdId, onClose, initialData }: TransactionFormProps) {
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');
  const [amountStr, setAmountStr] = useState(initialData?.amount ? new Intl.NumberFormat('id-ID').format(initialData.amount) : '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [date, setDate] = useState(initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [isListening, setIsListening] = useState(false);
  
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  useEffect(() => {
    const path = `households/${householdId}/categories`;
    const q = query(collection(db, path), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomCategories(cats);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [householdId]);

  const defaultCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const currentCustomCategories = customCategories.filter(c => c.type === type);
  
  const categoryObjects = [
    ...defaultCategories.map(name => ({ id: name, name, isCustom: false })),
    ...currentCustomCategories.map(c => ({ id: c.id, name: c.name, isCustom: true }))
  ];

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || isSavingCategory) return;
    
    setIsSavingCategory(true);
    try {
      if (editingCategory) {
        const path = `households/${householdId}/categories/${editingCategory.id}`;
        await updateDoc(doc(db, path), { name: newCategoryName.trim() });
        
        // Update all transactions that use this category
        const txPath = `households/${householdId}/transactions`;
        const q = query(collection(db, txPath), where('category', '==', editingCategory.name));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach(d => {
            batch.update(d.ref, { category: newCategoryName.trim() });
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
          authorUid: auth.currentUser?.uid
        });
        setCategory(newCategoryName.trim());
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

  const handleDeleteCategory = async (cat: any) => {
    try {
      // Check if used
      const txPath = `households/${householdId}/transactions`;
      const q = query(collection(db, txPath), where('category', '==', cat.name), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        alert(`Kategori "${cat.name}" tidak bisa dihapus karena sudah digunakan pada transaksi.`);
        return;
      }
      
      if (confirm(`Hapus kategori "${cat.name}"?`)) {
        const path = `households/${householdId}/categories/${cat.id}`;
        await deleteDoc(doc(db, path));
        if (category === cat.name) setCategory('');
      }
    } catch (error) {
      console.error('Failed to delete category', error);
      alert('Gagal menghapus kategori.');
    }
  };

  const parseIndonesianNumberWords = (text: string): number => {
    const words = text.toLowerCase().split(/\s+/);
    const map: Record<string, number> = {
      'nol': 0, 'satu': 1, 'se': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5,
      'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10,
      'sebelas': 11, 'belas': 10, 'puluh': 10, 'ratus': 100, 'ribu': 1000, 'juta': 1000000
    };

    let total = 0;
    let current = 0;

    words.forEach(word => {
      if (map[word] !== undefined) {
        const val = map[word];
        if (val === 1000000 || val === 1000) {
          if (current === 0) current = 1;
          total += current * val;
          current = 0;
        } else if (val === 100 || val === 10) {
          if (current === 0) current = 1;
          current *= val;
        } else if (word === 'belas') {
          current += 10;
        } else {
          current += val;
        }
      }
    });
    total += current;
    return total;
  };

  const processVoiceInput = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    
    // 1. Extract Amount using Regex
    let amount = 0;
    // Strong regex for numbers like "50.000", "50rb", "1 juta", "10000"
    const amountRegex = /(\d+[\d\.,]*)\s*(ribu|rb|juta|jt)?/i;
    const match = lowerText.match(amountRegex);
    
    if (match) {
      let valStr = match[1].replace(/\./g, '').replace(/,/g, '.');
      let val = parseFloat(valStr);
      const multiplier = match[2]?.toLowerCase();
      if (multiplier === 'ribu' || multiplier === 'rb') val *= 1000;
      if (multiplier === 'juta' || multiplier === 'jt') val *= 1000000;
      amount = val;
    } else {
      // Fallback to word-based parsing
      amount = parseIndonesianNumberWords(lowerText);
    }

    if (amount > 0) {
      setAmountStr(new Intl.NumberFormat('id-ID').format(amount));
    }

    // 2. Match Category
    let foundCategory = '';
    let foundType: 'income' | 'expense' = 'expense';

    // Search through keywords
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => lowerText.includes(kw))) {
        foundCategory = cat;
        foundType = INCOME_CATEGORIES.includes(cat) ? 'income' : 'expense';
        break;
      }
    }

    // Search through custom categories if not found
    if (!foundCategory) {
      for (const customCat of customCategories) {
        if (lowerText.includes(customCat.name.toLowerCase())) {
          foundCategory = customCat.name;
          foundType = customCat.type;
          break;
        }
      }
    }

    // 3. Set UI State
    if (foundCategory) {
      setType(foundType);
      setCategory(foundCategory);
      // Clean up note: remove the amount and category keywords if possible, 
      // but for simplicity, we'll just use the transcript as note or a cleaned version
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

    // Reset state before starting
    setIsListening(true);

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      // Already set to true, but good to confirm
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        alert('Izin mikrofon ditolak. Pastikan Anda memberikan izin akses mikrofon di browser atau buka aplikasi di tab baru jika masih bermasalah.');
      } else if (event.error === 'network') {
        alert('Gagal terhubung ke layanan pengenal suara (Network Error). \n\nHal ini biasanya terjadi karena:\n1. Koneksi internet tidak stabil.\n2. Layanan pengenalan suara Google sedang sibuk atau diblokir oleh jaringan Anda.\n\nSilakan coba lagi dalam beberapa saat atau gunakan input manual.');
      } else if (event.error === 'no-speech') {
        // Silent fail for no speech detected
      } else {
        alert(`Terjadi kesalahan pada Voice Input: ${event.error}`);
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      processVoiceInput(transcript);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition', e);
      setIsListening(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setAmountStr('');
      return;
    }
    const formatted = new Intl.NumberFormat('id-ID').format(parseInt(rawValue, 10));
    setAmountStr(formatted);
  };

  const addAmount = (addValue: number) => {
    const current = parseInt(amountStr.replace(/\D/g, '') || '0', 10);
    const newValue = current + addValue;
    setAmountStr(new Intl.NumberFormat('id-ID').format(newValue));
  };

  const appendZeros = () => {
    if (!amountStr) return;
    const rawValue = amountStr.replace(/\D/g, '') + '000';
    setAmountStr(new Intl.NumberFormat('id-ID').format(parseInt(rawValue, 10)));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseInt(amountStr.replace(/\D/g, ''), 10);
    if (!numericAmount || isNaN(numericAmount) || !category || !auth.currentUser || isSubmitting) return;

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
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
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
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-800">{initialData ? 'Edit Transaksi' : 'Transaksi Baru'}</h2>
              {!initialData && (
                <button
                  type="button"
                  onClick={startListening}
                  disabled={isListening}
                  className={cn(
                    "p-2 rounded-full transition-all relative disabled:opacity-100",
                    isListening ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  {isListening ? (
                    <>
                      <Mic className="w-5 h-5" />
                      <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-25" />
                    </>
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
            {/* Type Selector */}
            <div className="flex p-1 bg-slate-100 rounded-2xl relative">
              <div
                className={cn(
                  "absolute inset-y-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-in-out",
                  type === 'income' ? "left-1" : "left-[calc(50%+2px)]"
                )}
              />
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setCategory('');
                }}
                className={cn(
                  "flex-1 py-3 text-sm font-medium z-10 transition-colors",
                  type === 'income' ? "text-emerald-600" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setCategory('');
                }}
                className={cn(
                  "flex-1 py-3 text-sm font-medium z-10 transition-colors",
                  type === 'expense' ? "text-rose-600" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Pengeluaran
              </button>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600 px-1">Jumlah</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                <input
                  type="tel"
                  required
                  value={amountStr}
                  onChange={handleAmountChange}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-lg font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 transition-shadow"
                  placeholder="0"
                />
              </div>
              {/* Quick Amount Buttons */}
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1 hide-scrollbar">
                <button type="button" onClick={() => addAmount(10000)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-slate-200 active:scale-95 transition-all">+10rb</button>
                <button type="button" onClick={() => addAmount(50000)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-slate-200 active:scale-95 transition-all">+50rb</button>
                <button type="button" onClick={() => addAmount(100000)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-slate-200 active:scale-95 transition-all">+100rb</button>
                <button type="button" onClick={appendZeros} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-slate-200 active:scale-95 transition-all">+000</button>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 px-1">Kategori</label>
              <div className="grid grid-cols-3 gap-2">
                {categoryObjects.map(cat => (
                  <div key={cat.id} className="relative group">
                    <label 
                      className={cn(
                        "cursor-pointer flex items-center justify-center text-center px-1 py-3 rounded-xl border text-xs font-medium transition-all select-none h-full min-h-[3rem]", 
                        category === cat.name 
                          ? (type === 'income' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700") 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <input 
                        type="radio" 
                        name="category" 
                        value={cat.name} 
                        checked={category === cat.name} 
                        onChange={() => setCategory(cat.name)} 
                        className="hidden" 
                        required
                      />
                      <span className="flex-1 line-clamp-2 px-1">{cat.name}</span>
                    </label>
                    {cat.isCustom && (
                      <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1 z-10">
                        <button 
                          type="button" 
                          onClick={(e) => { 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            setEditingCategory(cat);
                            setNewCategoryName(cat.name);
                            setIsCategoryModalOpen(true);
                          }} 
                          className="p-1.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-full shadow-sm transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteCategory(cat);
                          }} 
                          className="p-1.5 bg-rose-100 text-rose-600 hover:bg-rose-200 rounded-full shadow-sm transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setNewCategoryName('');
                    setIsCategoryModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-1 text-center px-1 py-3 rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all select-none h-full min-h-[3rem]"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600 px-1">Catatan (Opsional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 focus:ring-2 focus:ring-slate-900 transition-shadow"
                placeholder="Tambah catatan..."
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600 px-1">Tanggal</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 focus:ring-2 focus:ring-slate-900 transition-shadow"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-semibold text-lg hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Simpan Transaksi
                </>
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>

      {/* Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
              </h3>
              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600 px-1">Nama Kategori</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-900 focus:ring-2 focus:ring-slate-900 transition-shadow"
                    placeholder="Contoh: Cicilan Motor"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!newCategoryName.trim() || isSavingCategory}
                    className="flex-1 py-3 px-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isSavingCategory ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Simpan'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
