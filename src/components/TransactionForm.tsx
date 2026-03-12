import { useState, useEffect, useCallback } from 'react';
import { db, collection, addDoc, updateDoc, doc, auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Mic } from 'lucide-react';
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

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

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
  }, []);

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

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        alert('Izin mikrofon ditolak. Pastikan Anda memberikan izin akses mikrofon di browser atau buka aplikasi di tab baru jika masih bermasalah.');
      } else if (event.error === 'network') {
        alert('Gagal terhubung ke layanan pengenal suara (Network Error). Pastikan koneksi internet Anda stabil. Jika Anda menggunakan Chrome, fitur ini memerlukan akses ke server Google.');
      } else {
        alert(`Terjadi kesalahan pada Voice Input: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      processVoiceInput(transcript);
    };

    recognition.start();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseInt(amountStr.replace(/\D/g, ''), 10);
    if (!numericAmount || isNaN(numericAmount) || !category || !auth.currentUser) return;

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
            authorName: auth.currentUser.displayName || auth.currentUser.email || 'Unknown',
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      }
      onClose();
    } catch (error) {
      console.error('Failed to save transaction:', error);
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
              <h2 className="text-xl font-semibold text-slate-800">{initialData ? 'Edit Transaction' : 'New Transaction'}</h2>
              {!initialData && (
                <button
                  type="button"
                  onClick={startListening}
                  className={cn(
                    "p-2 rounded-full transition-all relative",
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
                Income
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
                Expense
              </button>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600 px-1">Amount</label>
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
              <label className="text-sm font-medium text-slate-600 px-1">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map(cat => (
                  <label 
                    key={cat} 
                    className={cn(
                      "cursor-pointer flex items-center justify-center text-center px-1 py-3 rounded-xl border text-xs font-medium transition-all select-none h-full min-h-[3rem]", 
                      category === cat 
                        ? (type === 'income' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700") 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="category" 
                      value={cat} 
                      checked={category === cat} 
                      onChange={() => setCategory(cat)} 
                      className="hidden" 
                      required
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600 px-1">Note (Optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 focus:ring-2 focus:ring-slate-900 transition-shadow"
                placeholder="Add a note..."
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600 px-1">Date</label>
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
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-semibold text-lg hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Save Transaction
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
