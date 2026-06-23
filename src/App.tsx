import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { AuthSetup } from './components/AuthSetup';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { MonthlyShoppingPlanner } from './components/MonthlyShoppingPlanner';
import { CategoriesPage } from './components/CategoriesPage';
import { auth, db, logout, onSnapshot, collection, query, orderBy, setDoc, doc, getDoc } from './firebase';
import { Plus, Activity, ListOrdered, LogOut, Download, CloudOff, PieChart, Settings as SettingsIcon, Share, PlusSquare, X, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { Skeleton } from './components/Skeleton';

export default function App() {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'reports' | 'settings' | 'shopping' | 'categories'>('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [alertMessage, setAlertMessage] = useState<{title: string, message: string} | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showMiniInfoBar, setShowMiniInfoBar] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    setIsIosDevice(isIos);

    // Detect standalone
    const isStandAlone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!isStandAlone);

    // For iOS, show the mini infobar after a short delay since beforeinstallprompt doesn't fire
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
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
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
        // Fetch user's household
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

  const handleLogout = async () => {
    await logout();
    setHouseholdId(null);
    setShowLogoutConfirm(false);
  };

  useEffect(() => {
    if (!householdId) return;

    const path = `households/${householdId}/transactions`;
    const q = query(
      collection(db, path),
      orderBy('createdAt', 'desc')
    );

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (auth.currentUser && data.authorUid !== auth.currentUser.uid) {
            setAlertMessage({
              title: 'Transaksi Baru',
              message: `${data.authorName} baru saja menambahkan transaksi ${data.type === 'income' ? 'pemasukan' : 'pengeluaran'} sebesar Rp ${new Intl.NumberFormat('id-ID').format(data.amount)} untuk ${data.category}.`
            });
          }
        }
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [householdId]);

  const renderContent = () => {
    if (!isLoaded) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full rounded-3xl" />
            <Skeleton className="h-24 w-full rounded-3xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </div>
      );
    }

    if (!householdId) {
      return <AuthSetup onComplete={setHouseholdId} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            householdId={householdId}
            onOpenShoppingPlanner={() => setActiveTab('shopping')}
            onOpenCategories={() => setActiveTab('categories')}
          />
        );
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
      case 'shopping':
        return <MonthlyShoppingPlanner householdId={householdId} />;
      case 'categories':
        return <CategoriesPage householdId={householdId} />;
      case 'reports':
        return <Reports householdId={householdId} />;
      case 'settings':
        return <Settings householdId={householdId} onLogout={() => setShowLogoutConfirm(true)} />;
      default:
        return <Dashboard householdId={householdId} onOpenShoppingPlanner={() => setActiveTab('shopping')} onOpenCategories={() => setActiveTab('categories')} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-transparent bg-[#f5f7fb]/80 px-6 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-900/15">M</span>
              <div>
                <h1 className="text-base font-black tracking-tight text-slate-950">Moni</h1>
                <p className="text-xs font-medium text-slate-500">Personal money cockpit</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
          {!isLoaded ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : (
            <>
              {!isOnline && (
                <div className="flex items-center gap-1.5 text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full text-xs font-medium">
                  <CloudOff className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-5 pb-8 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={isLoaded ? activeTab : 'loading'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-transparent bg-transparent px-3 pb-3">
        <div className="relative mx-auto flex max-w-md items-center justify-around rounded-[22px] border border-white/70 bg-slate-950/95 p-1.5 shadow-[0_16px_45px_rgba(15,23,42,0.24)] backdrop-blur-xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            disabled={!isLoaded || !householdId}
            className={cn(
              "flex flex-1 flex-col items-center rounded-[18px] px-2 py-2 transition-all duration-200",
              activeTab === 'dashboard' ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:bg-white/10 hover:text-white",
              (!isLoaded || !householdId) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Activity className="mb-0.5 h-5 w-5" />
            <span className="text-[9px] font-semibold uppercase tracking-wide">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            disabled={!isLoaded || !householdId}
            className={cn(
              "flex flex-1 flex-col items-center rounded-[18px] px-2 py-2 transition-all duration-200",
              activeTab === 'history' ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:bg-white/10 hover:text-white",
              (!isLoaded || !householdId) && "opacity-50 cursor-not-allowed"
            )}
          >
            <ListOrdered className="mb-0.5 h-5 w-5" />
            <span className="text-[9px] font-semibold uppercase tracking-wide">Riwayat</span>
          </button>

          {/* Floating Action Button Placeholder for spacing */}
          <div className="w-12" />

          <button
            onClick={() => setActiveTab('reports')}
            disabled={!isLoaded || !householdId}
            className={cn(
              "flex flex-1 flex-col items-center rounded-[18px] px-2 py-2 transition-all duration-200",
              activeTab === 'reports' ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:bg-white/10 hover:text-white",
              (!isLoaded || !householdId) && "opacity-50 cursor-not-allowed"
            )}
          >
            <PieChart className="mb-0.5 h-5 w-5" />
            <span className="text-[9px] font-semibold uppercase tracking-wide">Laporan</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            disabled={!isLoaded || !householdId}
            className={cn(
              "flex flex-1 flex-col items-center rounded-[18px] px-2 py-2 transition-all duration-200",
              activeTab === 'settings' ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:bg-white/10 hover:text-white",
              (!isLoaded || !householdId) && "opacity-50 cursor-not-allowed"
            )}
          >
            <SettingsIcon className="mb-0.5 h-5 w-5" />
            <span className="text-[9px] font-semibold uppercase tracking-wide">Pengaturan</span>
          </button>

          {/* Floating Action Button */}
          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsFormOpen(true);
            }}
            disabled={!isLoaded || !householdId}
            className={cn(
              "absolute left-1/2 -top-5 -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-3 text-white shadow-[0_12px_28px_rgba(79,70,229,0.42)] ring-[3px] ring-[#f5f7fb] transition-all hover:scale-105 active:scale-95",
              (!isLoaded || !householdId) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Transaction Form Modal */}
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

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-2">Keluar Akun?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Anda akan keluar dari aplikasi. Data Anda tetap aman di cloud.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 px-4 bg-rose-600 text-white font-medium rounded-xl hover:bg-rose-700 transition-colors"
                >
                  Ya, Keluar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Alert Modal */}
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-2">{alertMessage.title}</h3>
              <p className="text-slate-500 text-sm mb-6 whitespace-pre-wrap">
                {alertMessage.message}
              </p>
              <button
                onClick={() => setAlertMessage(null)}
                className="w-full py-3 px-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Install Guide Prompt */}
        {showInstallGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm p-4 pb-12"
            onClick={() => setShowInstallGuide(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-900">Instal Aplikasi</h3>
                <button onClick={() => setShowInstallGuide(false)} className="p-1 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-slate-600 text-sm mb-6">
                Instal aplikasi ini di perangkat Anda untuk akses lebih cepat dan pengalaman layar penuh.
              </p>
              
              {isIosDevice ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-xl text-slate-700">
                      <Share className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-slate-700">
                      1. Ketuk ikon <span className="font-bold">Bagikan (Share)</span> di menu bawah browser Anda.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-xl text-slate-700">
                      <PlusSquare className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-slate-700">
                      2. Gulir ke bawah dan ketuk <span className="font-bold">"Tambah ke Layar Utama" (Add to Home Screen)</span>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-xl text-slate-700">
                      <MoreVertical className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-slate-700">
                      1. Ketuk ikon <span className="font-bold">Menu (Tiga Titik)</span> di pojok kanan atas browser Anda.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-xl text-slate-700">
                      <Download className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-slate-700">
                      2. Pilih <span className="font-bold">"Instal Aplikasi" (Install App)</span> atau <span className="font-bold">"Tambahkan ke Layar Utama"</span>.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowInstallGuide(false)}
                className="w-full mt-8 py-3 px-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
              >
                Mengerti
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Custom Mini Infobar mimicking native Chrome */}
        {showMiniInfoBar && !isStandalone && (deferredPrompt || isIosDevice) && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 sm:pb-4 sm:px-4"
          >
            <div 
              className="bg-white border-t sm:border border-slate-200 sm:rounded-xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] sm:shadow-2xl p-3 flex items-center justify-between cursor-pointer max-w-md mx-auto"
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
                <img src="/android-chrome-192x192.png" alt="Moni" className="w-10 h-10 rounded-full shadow-sm" />
                <span className="text-slate-800 font-medium text-[15px]">Add Moni to Home Screen</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMiniInfoBar(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
