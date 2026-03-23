import { useEffect, useState } from 'react';
import {
  Activity,
  CloudOff,
  Download,
  Home,
  ListOrdered,
  MoreVertical,
  Plus,
  PlusSquare,
  Settings as SettingsIcon,
  Share,
  Sparkles,
  WalletCards,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { AuthSetup } from './components/AuthSetup';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Skeleton } from './components/Skeleton';
import { auth, db, logout, onSnapshot, collection, query, orderBy, doc, getDoc } from './firebase';
import { cn } from './lib/utils';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';

const tabs = [
  { key: 'dashboard', label: 'Beranda', icon: Home },
  { key: 'history', label: 'Catatan', icon: ListOrdered },
  { key: 'reports', label: 'Analitik', icon: Activity },
  { key: 'settings', label: 'Profil', icon: SettingsIcon },
] as const;

export default function App() {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['key']>('dashboard');
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

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(Boolean(standalone));

    if (isIos && !standalone) {
      const timer = setTimeout(() => setShowMiniInfoBar(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault();
      setDeferredPrompt(event);
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
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
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
    const transactionsQuery = query(collection(db, path), orderBy('createdAt', 'desc'));
    let isInitialLoad = true;

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        if (isInitialLoad) {
          isInitialLoad = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const data = change.doc.data();
          if (auth.currentUser && data.authorUid !== auth.currentUser.uid) {
            setAlertMessage({
              title: 'Update baru masuk',
              message: `${data.authorName} menambahkan ${data.type === 'income' ? 'pemasukan' : 'pengeluaran'} sebesar Rp ${new Intl.NumberFormat('id-ID').format(data.amount)} pada kategori ${data.category}.`,
            });
          }
        });
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );

    return () => unsubscribe();
  }, [householdId]);

  const handleLogout = async () => {
    await logout();
    setHouseholdId(null);
    setShowLogoutConfirm(false);
  };

  const renderContent = () => {
    if (!isLoaded) {
      return (
        <div className="space-y-5">
          <Skeleton className="h-40 w-full rounded-[1.75rem]" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-28 w-full rounded-[1.5rem]" />
            <Skeleton className="h-28 w-full rounded-[1.5rem]" />
          </div>
          <Skeleton className="h-64 w-full rounded-[1.75rem]" />
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

  const activeTabMeta = tabs.find((tab) => tab.key === activeTab);

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-28 pt-4 text-[color:var(--moni-text)] sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,162,218,0.28),transparent_26%),radial-gradient(circle_at_top_right,rgba(111,109,244,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,207,111,0.2),transparent_28%)]" />

      <div className="relative mx-auto max-w-2xl">
        <div className="moni-shell min-h-[calc(100vh-2rem)] px-4 pb-28 pt-4 sm:px-5">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1.2rem] bg-white/85 shadow-[0_10px_30px_rgba(125,104,196,0.15)]">
                  <WalletCards className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-violet-400">Moni</p>
                  <h1 className="text-xl font-semibold tracking-tight">{householdId ? 'Pantau uang tanpa ribet' : 'Money tracker untuk berdua'}</h1>
                </div>
              </div>
              <p className="mt-3 max-w-md text-sm leading-6 text-[color:var(--moni-subtle)]">
                {householdId
                  ? activeTab === 'dashboard'
                    ? 'Ringkas, manis, dan gampang dipahami. Fokus ke apa yang benar-benar penting hari ini.'
                    : `Halaman ${activeTabMeta?.label.toLowerCase()} dibuat lebih ringan supaya kamu cepat ambil keputusan.`
                  : 'Catat pemasukan, pengeluaran, dan bagi akses household dalam satu tampilan yang lebih menyenangkan.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!isOnline && (
                <div className="moni-pill gap-2 border-rose-100 bg-rose-50/80 text-rose-500">
                  <CloudOff className="h-3.5 w-3.5" /> Offline
                </div>
              )}
              <div className="moni-pill hidden sm:inline-flex">v1.1.0</div>
            </div>
          </header>

          {householdId && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <div className="moni-pill gap-2 bg-violet-50/90 text-violet-600">
                <Sparkles className="h-3.5 w-3.5" /> Desain baru lebih fokus
              </div>
              <div className="moni-pill">{activeTabMeta?.label}</div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={isLoaded ? activeTab : 'loading'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {householdId && (
        <nav className="fixed inset-x-0 bottom-4 z-40 px-4 sm:px-6">
          <div className="mx-auto flex max-w-md items-center justify-between rounded-[1.7rem] border border-white/80 bg-white/88 p-2 shadow-[0_20px_50px_rgba(125,104,196,0.2)] backdrop-blur-xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-1 rounded-[1.2rem] px-2 py-2 text-[11px] font-semibold transition-all',
                    isActive ? 'moni-hero text-white shadow-[0_12px_30px_rgba(151,103,218,0.28)]' : 'text-[color:var(--moni-subtle)] hover:bg-white/80'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => {
                setEditingTransaction(null);
                setIsFormOpen(true);
              }}
              className="absolute left-1/2 top-1/2 flex h-15 w-15 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.35rem] border-4 border-[#f6f2ff] moni-hero text-white shadow-[0_20px_40px_rgba(151,103,218,0.35)] transition hover:scale-105"
            >
              <Plus className="h-7 w-7" />
            </button>
          </div>
        </nav>
      )}

      {isFormOpen && householdId && (
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
          <ModalCard onClose={() => setShowLogoutConfirm(false)} title="Keluar dari akun?" description="Tenang, semua data tetap aman tersimpan di cloud dan bisa dibuka lagi kapan saja.">
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 rounded-[1.2rem] bg-slate-100 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-200">Batal</button>
              <button onClick={handleLogout} className="flex-1 rounded-[1.2rem] bg-rose-500 px-4 py-3 font-semibold text-white transition hover:bg-rose-600">Ya, keluar</button>
            </div>
          </ModalCard>
        )}

        {alertMessage && (
          <ModalCard onClose={() => setAlertMessage(null)} title={alertMessage.title} description={alertMessage.message}>
            <button onClick={() => setAlertMessage(null)} className="moni-primary-button w-full justify-center">Mengerti</button>
          </ModalCard>
        )}

        {showInstallGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 p-4 pb-10 backdrop-blur-sm"
            onClick={() => setShowInstallGuide(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 210 }}
              className="w-full max-w-sm rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_24px_60px_rgba(84,64,150,0.24)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">Pasang aplikasi Moni</h3>
                  <p className="mt-1 text-sm text-[color:var(--moni-subtle)]">Buka lebih cepat dan nikmati mode layar penuh seperti aplikasi native.</p>
                </div>
                <button onClick={() => setShowInstallGuide(false)} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {isIosDevice ? (
                <div className="space-y-4">
                  <Step icon={<Share className="h-5 w-5" />} text="Ketuk tombol Bagikan di browser Safari Anda." />
                  <Step icon={<PlusSquare className="h-5 w-5" />} text="Pilih Tambah ke Layar Utama agar Moni tampil seperti aplikasi." />
                </div>
              ) : (
                <div className="space-y-4">
                  <Step icon={<MoreVertical className="h-5 w-5" />} text="Buka menu browser di pojok kanan atas." />
                  <Step icon={<Download className="h-5 w-5" />} text="Pilih Instal Aplikasi atau Tambahkan ke Layar Utama." />
                </div>
              )}

              <button onClick={() => setShowInstallGuide(false)} className="moni-primary-button mt-8 w-full justify-center">Siap</button>
            </motion.div>
          </motion.div>
        )}

        {showMiniInfoBar && !isStandalone && (deferredPrompt || isIosDevice) && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed inset-x-0 bottom-20 z-50 px-4 sm:px-6">
            <div
              className="mx-auto flex max-w-md cursor-pointer items-center justify-between rounded-[1.5rem] border border-white/80 bg-white/95 p-3 shadow-[0_20px_45px_rgba(84,64,150,0.18)]"
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
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] moni-hero text-white shadow-[0_10px_25px_rgba(151,103,218,0.28)]">
                  <WalletCards className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Tambahkan Moni ke Home Screen</p>
                  <p className="text-xs text-[color:var(--moni-subtle)]">Buka lebih cepat tanpa cari-cari tab browser.</p>
                </div>
              </div>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setShowMiniInfoBar(false);
                }}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Step({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[1.35rem] bg-[#f7f4ff] p-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-white text-violet-500 shadow-[0_10px_25px_rgba(125,104,196,0.12)]">{icon}</div>
      <p className="text-sm leading-6 text-[color:var(--moni-text)]">{text}</p>
    </div>
  );
}

function ModalCard({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-sm rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_24px_60px_rgba(84,64,150,0.24)]" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--moni-subtle)]">{description}</p>
        <div className="mt-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}
