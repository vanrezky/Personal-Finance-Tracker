import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  CloudOff,
  Download,
  ListOrdered,
  MoreVertical,
  PieChart,
  Plus,
  PlusSquare,
  Settings as SettingsIcon,
  Share,
  Sparkles,
  X,
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { AuthSetup } from './components/AuthSetup';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { auth, db, logout, onSnapshot, collection, query, orderBy, doc, getDoc } from './firebase';
import { cn } from './lib/utils';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { Skeleton } from './components/Skeleton';

type AppTab = 'dashboard' | 'history' | 'reports' | 'settings';

const tabMeta: Record<AppTab, { label: string; subtitle: string; icon: typeof Activity }> = {
  dashboard: {
    label: 'Beranda',
    subtitle: 'Pantau cashflow dan sorotan pengeluaran hari ini.',
    icon: Activity,
  },
  history: {
    label: 'Aktivitas',
    subtitle: 'Riwayat transaksi yang rapi dan mudah difilter.',
    icon: ListOrdered,
  },
  reports: {
    label: 'Statistik',
    subtitle: 'Lihat pola pengeluaran tanpa terlalu banyak kartu.',
    icon: PieChart,
  },
  settings: {
    label: 'Profil',
    subtitle: 'Atur identitas, payday, dan akses keluarga.',
    icon: SettingsIcon,
  },
};

export default function App() {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showMiniInfoBar, setShowMiniInfoBar] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    setIsIosDevice(isIos);

    const isStandAlone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!isStandAlone);

    if (isIos && !isStandAlone) {
      const timer = setTimeout(() => {
        setShowMiniInfoBar(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowMiniInfoBar(true);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const path = `users/${user.uid}`;
        try {
          const userDoc = await getDoc(doc(db, path));
          if (userDoc.exists() && userDoc.data().currentHouseholdId) {
            setHouseholdId(userDoc.data().currentHouseholdId);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, path);
        }
      } else {
        setHouseholdId(null);
      }
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!householdId) return;

    const path = `households/${householdId}/transactions`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    let isInitialLoad = true;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (isInitialLoad) {
          isInitialLoad = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (auth.currentUser && data.authorUid !== auth.currentUser.uid) {
              setAlertMessage({
                title: 'Transaksi baru masuk',
                message: `${data.authorName} baru menambahkan ${data.type === 'income' ? 'pemasukan' : 'pengeluaran'} Rp ${new Intl.NumberFormat('id-ID').format(data.amount)} pada kategori ${data.category}.`,
              });
            }
          }
        });
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      },
    );

    return () => unsubscribe();
  }, [householdId]);

  const handleLogout = async () => {
    await logout();
    setHouseholdId(null);
    setShowLogoutConfirm(false);
  };

  const activeTabMeta = tabMeta[activeTab];
  const ActiveIcon = activeTabMeta.icon;

  const renderContent = () => {
    if (!isLoaded) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-[32px]" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-28 w-full rounded-[28px]" />
            <Skeleton className="h-28 w-full rounded-[28px]" />
          </div>
          <Skeleton className="h-72 w-full rounded-[32px]" />
        </div>
      );
    }

    if (!householdId) {
      return <AuthSetup onComplete={setHouseholdId} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard householdId={householdId} />;
      case 'history':
        return (
          <TransactionList
            householdId={householdId}
            onEdit={(transaction) => {
              setEditingTransaction(transaction);
              setIsFormOpen(true);
            }}
          />
        );
      case 'reports':
        return <Reports householdId={householdId} />;
      case 'settings':
        return <Settings householdId={householdId} onLogout={() => setShowLogoutConfirm(true)} />;
      default:
        return <Dashboard householdId={householdId} />;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-28 pt-4 text-slate-900 sm:px-6 sm:pt-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-12 h-48 w-48 rounded-full bg-pink-200/50 blur-3xl" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute bottom-24 left-1/3 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[430px] flex-col rounded-[36px] border border-white/60 bg-white/45 shadow-[0_30px_120px_rgba(99,102,241,0.18)] backdrop-blur-2xl">
        <header className="sticky top-0 z-30 rounded-t-[36px] border-b border-white/60 bg-white/55 px-5 py-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gradient-to-r from-indigo-500 to-pink-400 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white">
                  Monity ID
                </span>
                {!isLoaded ? null : !isOnline ? (
                  <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-500">
                    <CloudOff className="h-3.5 w-3.5" /> Offline
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex items-center gap-2 text-slate-900">
                <div className="rounded-2xl bg-indigo-100 p-2.5 text-indigo-600">
                  <ActiveIcon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">{householdId ? activeTabMeta.label : 'Cara mudah pantau pengeluaran'}</h1>
                  <p className="mt-0.5 text-sm text-slate-500">{householdId ? activeTabMeta.subtitle : 'Desain baru yang lebih ringan, fokus, dan tetap informatif.'}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[22px] bg-white/80 px-3 py-2 text-right shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">versi</p>
              <p className="text-sm font-semibold text-slate-700">1.1.0</p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLoaded ? (householdId ? activeTab : 'auth') : 'loading'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] px-4 pb-4">
          <div className="relative rounded-[28px] border border-white/70 bg-white/90 px-2 pb-2 pt-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="grid grid-cols-5 items-end gap-1">
              {([
                ['dashboard', Activity],
                ['history', ListOrdered],
                ['spacer', Plus],
                ['reports', PieChart],
                ['settings', SettingsIcon],
              ] as const).map(([tab, Icon]) => {
                if (tab === 'spacer') {
                  return <div key={tab} className="h-12" />;
                }

                const meta = tabMeta[tab as AppTab];
                const isActive = activeTab === tab;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as AppTab)}
                    disabled={!isLoaded || !householdId}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-[20px] px-2 py-2.5 text-[10px] font-semibold transition-all',
                      isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700',
                      (!isLoaded || !householdId) && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setEditingTransaction(null);
                setIsFormOpen(true);
              }}
              disabled={!isLoaded || !householdId}
              className={cn(
                'absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/3 items-center justify-center rounded-[22px] bg-gradient-to-br from-pink-400 to-pink-500 text-white shadow-[0_16px_40px_rgba(244,114,182,0.35)] transition hover:scale-105 active:scale-95',
                (!isLoaded || !householdId) && 'cursor-not-allowed opacity-50',
              )}
            >
              <Plus className="h-7 w-7" />
            </button>
          </div>
        </nav>
      </div>

      {isFormOpen && (
        <TransactionForm
          householdId={householdId}
          onClose={() => {
            setIsFormOpen(false);
            setEditingTransaction(null);
          }}
          initialData={editingTransaction}
        />
      )}

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900">Keluar dari akun?</h3>
              <p className="mt-2 text-sm text-slate-500">Tenang, semua data keluarga tetap tersimpan di cloud dan bisa diakses lagi kapan saja.</p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-700">
                  Batal
                </button>
                <button onClick={handleLogout} className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 font-medium text-white">
                  Ya, keluar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {alertMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900">{alertMessage.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">{alertMessage.message}</p>
              <button onClick={() => setAlertMessage(null)} className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white">
                Tutup
              </button>
            </motion.div>
          </motion.div>
        )}

        {showInstallGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 pb-12 backdrop-blur-sm"
            onClick={() => setShowInstallGuide(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-lg font-bold text-slate-900">Instal aplikasi</h3>
                <button onClick={() => setShowInstallGuide(false)} className="rounded-full bg-slate-100 p-2 text-slate-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-6 text-sm text-slate-600">Tambahkan aplikasi ini ke home screen supaya pengalaman terasa lebih cepat dan mirip aplikasi native.</p>

              {isIosDevice ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                    <div className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm"><Share className="h-5 w-5" /></div>
                    <p className="text-sm text-slate-700">1. Ketuk tombol <span className="font-semibold">Bagikan</span> pada browser.</p>
                  </div>
                  <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                    <div className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm"><PlusSquare className="h-5 w-5" /></div>
                    <p className="text-sm text-slate-700">2. Pilih <span className="font-semibold">Tambah ke Layar Utama</span>.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                    <div className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm"><MoreVertical className="h-5 w-5" /></div>
                    <p className="text-sm text-slate-700">1. Buka menu browser di pojok kanan atas.</p>
                  </div>
                  <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                    <div className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm"><Download className="h-5 w-5" /></div>
                    <p className="text-sm text-slate-700">2. Pilih <span className="font-semibold">Instal Aplikasi</span> atau <span className="font-semibold">Tambahkan ke Layar Utama</span>.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {showMiniInfoBar && !isStandalone && (deferredPrompt || isIosDevice) && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed inset-x-0 bottom-3 z-50 mx-auto w-full max-w-[430px] px-4"
          >
            <div
              className="flex cursor-pointer items-center justify-between rounded-[24px] border border-white/70 bg-white/95 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.14)]"
              onClick={async () => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === 'accepted') {
                    setShowMiniInfoBar(false);
                    setDeferredPrompt(null);
                  }
                } else if (isIosDevice) {
                  setShowInstallGuide(true);
                  setShowMiniInfoBar(false);
                }
              }}
            >
              <div className="flex items-center gap-3">
                <img src="/android-chrome-192x192.png" alt="Monity ID" className="h-10 w-10 rounded-2xl shadow-sm" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Pasang Monity ID</p>
                  <p className="text-xs text-slate-500">Akses lebih cepat dari layar utama.</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMiniInfoBar(false);
                }}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
