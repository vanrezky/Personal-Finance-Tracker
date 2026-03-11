import { useState, useEffect } from 'react';
import { SyncIndicator } from './components/SyncIndicator';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { TokenSetup } from './components/TokenSetup';
import { Plus, Activity, ListOrdered, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('spreadsheet_token');
    if (savedToken) {
      setToken(savedToken);
    }
    setIsLoaded(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('spreadsheet_token');
    setToken(null);
    setShowLogoutConfirm(false);
  };

  if (!isLoaded) return null;

  if (!token) {
    return <TokenSetup onComplete={setToken} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Finance</h1>
        <div className="flex items-center gap-3">
          <SyncIndicator />
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
            title="Ganti Token"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8 max-w-2xl mx-auto space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Dashboard />
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <TransactionList />
            </motion.div>
          )}
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

          {/* Floating Action Button Placeholder for spacing */}
          <div className="w-16" />

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

          {/* Floating Action Button */}
          <button
            onClick={() => setIsFormOpen(true)}
            className="absolute left-1/2 -top-6 -translate-x-1/2 bg-slate-900 text-white p-4 rounded-full shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>
      </nav>

      {/* Transaction Form Modal */}
      {isFormOpen && (
        <TransactionForm onClose={() => setIsFormOpen(false)} />
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
              <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Token?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Anda akan memutus koneksi dengan Google Spreadsheet saat ini. Data transaksi di HP Anda tidak akan terhapus.
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
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
