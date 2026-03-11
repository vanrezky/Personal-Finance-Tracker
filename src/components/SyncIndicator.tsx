import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';

export function SyncIndicator({ onError }: { onError?: (title: string, message: string) => void }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const unsyncedCount = useLiveQuery(
    () => db.transactions.where('synced').equals(0).count(),
    []
  ) || 0;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && unsyncedCount > 0 && !isSyncing && !syncError) {
      syncData();
    }
  }, [isOnline, unsyncedCount]);

  const syncData = async () => {
    const token = localStorage.getItem('spreadsheet_token');
    if (!token) return;

    setIsSyncing(true);
    setSyncError(null);
    
    try {
      const unsynced = await db.transactions.where('synced').equals(0).toArray();
      if (unsynced.length === 0) return;

      // Prepare payload (remove local id and synced status)
      const payload = unsynced.map(({ id, synced, ...rest }) => rest);

      // Send to Google Apps Script Web App
      const response = await fetch(token, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        // Mark as synced
        await db.transaction('rw', db.transactions, async () => {
          for (const item of unsynced) {
            if (item.id) {
              await db.transactions.update(item.id, { synced: 1 });
            }
          }
        });
        console.log(`Synced ${unsynced.length} items to Google Sheets`);
      } else {
        throw new Error(result.message || 'Unknown error from Apps Script');
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      const isNetworkError = error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError');
      const errorMessage = isNetworkError 
        ? 'Gagal terhubung ke server. Pastikan Anda memilih "Siapa saja (Anyone)" pada bagian "Siapa yang memiliki akses" saat melakukan Deploy di Apps Script.'
        : error?.message || 'Periksa kembali URL Token atau pengaturan Apps Script Anda.';
      
      setSyncError(isNetworkError ? 'CORS/Network Error' : (error?.message || 'Gagal terhubung ke Spreadsheet'));
      if (onError) {
        onError('Gagal Sinkronisasi', `${errorMessage}\n\nPastikan Anda sudah melakukan "New Deployment" di Apps Script.`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <AnimatePresence mode="wait">
        {!isOnline ? (
          <motion.div
            key="offline"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-1.5 text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full"
          >
            <CloudOff className="w-3.5 h-3.5" />
            <span>Offline</span>
          </motion.div>
        ) : isSyncing ? (
          <motion.div
            key="syncing"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Syncing...</span>
          </motion.div>
        ) : syncError ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full cursor-pointer hover:bg-rose-100 transition-colors"
            onClick={syncData}
            title={syncError}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Sync Error (Tap to retry)</span>
          </motion.div>
        ) : unsyncedCount > 0 ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full cursor-pointer hover:bg-slate-200 transition-colors"
            onClick={syncData}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{unsyncedCount} pending</span>
          </motion.div>
        ) : (
          <motion.div
            key="synced"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Synced</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
