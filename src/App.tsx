import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { AuthSetup } from './components/AuthSetup';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'reports' | 'settings'>('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [alertMessage, setAlertMessage] = useState<{title: string, message: string} | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    setIsIosDevice(isIos);

    // Detect standalone
    const isStandAlone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!isStandAlone);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Finance</h1>
          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold tracking-wider">v1.1.0</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {!isLoaded ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : (
            <>
              {!isStandalone && (
                <button
                  onClick={async () => {
                    if (deferredPrompt) {
                      try {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                          setDeferredPrompt(null);
                        }
                      } catch (error) {
                        console.error('Prompt failed:', error);
                        setDeferredPrompt(null);
                      }
                    } else {
                      // If no deferred prompt (e.g. iOS or Chrome where it didn't fire), show manual guide
                      setShowInstallGuide(true);
                    }
                  }}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors flex items-center gap-1"
                  title="Instal Aplikasi"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs font-semibold">Instal</span>
                </button>
              )}
              
              {!isOnline && (
                <div className="flex items-center gap-1.5 text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full text-xs font-medium">
                  <CloudOff className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8 max-w-2xl mx-auto">
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
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200/50 pb-safe">
        <div className="flex items-center justify-around p-2 max-w-md mx-auto relative">
          <button
            onClick={() => setActiveTab('dashboard')}
            disabled={!isLoaded || !householdId}
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl flex-1 transition-colors",
              activeTab === 'dashboard' ? "text-slate-900" : "text-slate-400 hover:text-slate-600",
              (!isLoaded || !householdId) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Activity className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            disabled={!isLoaded || !householdId}
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl flex-1 transition-colors",
              activeTab === 'history' ? "text-slate-900" : "text-slate-400 hover:text-slate-600",
              (!isLoaded || !householdId) && "opacity-50 cursor-not-allowed"
            )}
          >
            <ListOrdered className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Riwayat</span>
          </button>

          {/* Floating Action Button Placeholder for spacing */}
          <div className="w-16" />

          <button
            onClick={() => setActiveTab('reports')}
            disabled={!isLoaded || !householdId}
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl flex-1 transition-colors",
              activeTab === 'reports' ? "text-slate-900" : "text-slate-400 hover:text-slate-600",
              (!isLoaded || !householdId) && "opacity-50 cursor-not-allowed"
            )}
          >
            <PieChart className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Laporan</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            disabled={!isLoaded || !householdId}
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl flex-1 transition-colors",
              activeTab === 'settings' ? "text-slate-900" : "text-slate-400 hover:text-slate-600",
              (!isLoaded || !householdId) && "opacity-50 cursor-not-allowed"
            )}
          >
            <SettingsIcon className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Pengaturan</span>
          </button>

          {/* Floating Action Button */}
          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsFormOpen(true);
            }}
            disabled={!isLoaded || !householdId}
            className={cn(
              "absolute left-1/2 -top-6 -translate-x-1/2 bg-slate-900 text-white p-4 rounded-full shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all",
              (!isLoaded || !householdId) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Plus className="w-8 h-8" />
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
      </AnimatePresence>
    </div>
  );
}
