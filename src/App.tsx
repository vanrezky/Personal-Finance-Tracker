import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { AuthSetup } from './components/AuthSetup';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { auth, db, logout, onSnapshot, collection, query, orderBy, setDoc, doc, getDoc } from './firebase';
import { Plus, Activity, ListOrdered, LogOut, Download, CloudOff, PieChart, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';

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

  if (!isLoaded) return null;

  if (!householdId) {
    return <AuthSetup onComplete={setHouseholdId} />;
  }

  const renderContent = () => {
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
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Finance</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          {deferredPrompt && (
            <button
              onClick={async () => {
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
              }}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors flex items-center gap-1"
              title="Install App"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs font-semibold">Install</span>
            </button>
          )}
          
          {!isOnline && (
            <div className="flex items-center gap-1.5 text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full text-xs font-medium">
              <CloudOff className="w-3.5 h-3.5" />
              <span>Offline</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
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
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl flex-1 transition-colors",
              activeTab === 'dashboard' ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Activity className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl flex-1 transition-colors",
              activeTab === 'history' ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <ListOrdered className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">History</span>
          </button>

          {/* Floating Action Button Placeholder for spacing */}
          <div className="w-16" />

          <button
            onClick={() => setActiveTab('reports')}
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl flex-1 transition-colors",
              activeTab === 'reports' ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <PieChart className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl flex-1 transition-colors",
              activeTab === 'settings' ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <SettingsIcon className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Settings</span>
          </button>

          {/* Floating Action Button */}
          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsFormOpen(true);
            }}
            className="absolute left-1/2 -top-6 -translate-x-1/2 bg-slate-900 text-white p-4 rounded-full shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all"
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
      </AnimatePresence>
    </div>
  );
}
