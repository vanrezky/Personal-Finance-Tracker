import { useState, useEffect } from 'react';
import { auth, loginWithGoogle, db, doc, setDoc, getDoc } from '../firebase';
import { motion } from 'motion/react';
import { Wallet, LogIn, Users } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function AuthSetup({ onComplete }: { onComplete: (householdId: string) => void }) {
  const [user, setUser] = useState(auth.currentUser);
  const [householdId, setHouseholdId] = useState('');
  const [payday, setPayday] = useState('25');
  const [displayName, setDisplayName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        setDisplayName(u.displayName || '');
        checkUserHousehold(u.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const checkUserHousehold = async (uid: string) => {
    const path = `users/${uid}`;
    try {
      const userDoc = await getDoc(doc(db, path));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.displayName) setDisplayName(data.displayName);
        if (data.currentHouseholdId) {
          onComplete(data.currentHouseholdId);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  };

  const handleLogin = async () => {
    try {
      setError('');
      const result = await loginWithGoogle();
      const u = result.user;
      setDisplayName(u.displayName || '');
      
      // Create or update user profile
      const path = `users/${u.uid}`;
      try {
        await setDoc(doc(db, path), {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      
    } catch (err: any) {
      setError(err.message || 'Gagal login dengan Google');
    }
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !householdId.trim()) return;
    
    setIsJoining(true);
    setError('');
    
    const hid = householdId.trim();
    const householdPath = `households/${hid}`;
    const userPath = `users/${user.uid}`;
    
    try {
      const householdRef = doc(db, 'households', hid);
      const householdDoc = await getDoc(householdRef);
      
      if (householdDoc.exists()) {
        // Join existing
        const members = householdDoc.data().members || [];
        if (!members.includes(user.uid)) {
          await setDoc(householdRef, {
            members: [...members, user.uid]
          }, { merge: true });
        }
      } else {
        // Create new
        await setDoc(householdRef, {
          name: 'My Household',
          members: [user.uid],
          createdAt: new Date().toISOString(),
          payday: parseInt(payday, 10)
        });
      }
      
      // Update user's profile and current household
      await setDoc(doc(db, userPath), {
        currentHouseholdId: hid,
        displayName: displayName || user.displayName || user.email
      }, { merge: true });
      
      onComplete(hid);
    } catch (err: any) {
      if (err.message?.includes('Missing or insufficient permissions') || err.message?.includes('permission-denied')) {
        handleFirestoreError(err, OperationType.WRITE, householdPath);
      }
      setError(err.message || 'Gagal bergabung dengan household');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 text-center"
      >
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Wallet className="w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Finance Sync</h1>
        <p className="text-slate-500 text-sm mb-8">
          Catat keuangan bersama pasangan secara real-time.
        </p>

        {!user ? (
          <button
            onClick={handleLogin}
            className="w-full py-4 px-4 bg-slate-900 text-white font-medium rounded-2xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Login dengan Google
          </button>
        ) : (
          <form onSubmit={handleJoinHousehold} className="space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nama Anda</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nama Panggilan"
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">ID Keluarga (Household ID)</label>
              <p className="text-[10px] text-slate-500 mb-1">
                Buat ID baru atau masukkan ID yang sama dengan pasangan Anda.
              </p>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={householdId}
                  onChange={(e) => setHouseholdId(e.target.value)}
                  placeholder="Contoh: keluarga-budi"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Tanggal Gajian</label>
              <p className="text-[10px] text-slate-500 mb-1">
                Digunakan untuk menghitung siklus bulanan di Dashboard.
              </p>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={payday}
                onChange={(e) => setPayday(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>

            {error && (
              <p className="text-rose-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={isJoining || !householdId.trim() || !displayName.trim()}
              className="w-full py-4 px-4 bg-indigo-600 text-white font-medium rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-4"
            >
              {isJoining ? 'Memproses...' : 'Mulai Gunakan'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
