import { useState, useEffect } from 'react';
import { auth, loginWithGoogle, db, doc, setDoc, getDoc } from '../firebase';
import { motion } from 'motion/react';
import { Wallet, LogIn, Users, Plus } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function AuthSetup({ onComplete }: { onComplete: (householdId: string) => void }) {
  const [user, setUser] = useState(auth.currentUser);
  const [householdId, setHouseholdId] = useState('');
  const [payday, setPayday] = useState('25');
  const [displayName, setDisplayName] = useState('');
  const [setupMode, setSetupMode] = useState<'choice' | 'create' | 'join'>('choice');
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

  const generateRandomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleStartCreate = () => {
    setHouseholdId(generateRandomId());
    setSetupMode('create');
  };

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
        
        // Check if user already has a household to redirect immediately
        await checkUserHousehold(u.uid);
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
    
    const hid = householdId.trim().toLowerCase();
    const householdPath = `households/${hid}`;
    const userPath = `users/${user.uid}`;
    
    try {
      const householdRef = doc(db, 'households', hid);
      const householdDoc = await getDoc(householdRef);
      
      if (setupMode === 'join') {
        if (!householdDoc.exists()) {
          throw new Error('ID tidak ditemukan. Pastikan ID yang Anda masukkan benar.');
        }
        // Join existing
        const members = householdDoc.data().members || [];
        if (!members.includes(user.uid)) {
          await setDoc(householdRef, {
            members: [...members, user.uid]
          }, { merge: true });
        }
      } else {
        // Create new
        if (householdDoc.exists()) {
          // Rare collision, regenerate
          const newId = generateRandomId();
          setHouseholdId(newId);
          throw new Error('Terjadi kesalahan teknis, silakan coba klik tombol simpan sekali lagi.');
        }
        await setDoc(householdRef, {
          name: 'My Household',
          members: [user.uid],
          ownerUid: user.uid,
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
      setError(err.message || 'Gagal memproses ID');
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
        ) : setupMode === 'choice' ? (
          <div className="space-y-4">
            <button
              onClick={handleStartCreate}
              className="w-full p-6 bg-indigo-50 text-indigo-700 rounded-3xl border-2 border-indigo-100 hover:border-indigo-300 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
              </div>
              <h3 className="font-bold">Buat ID Baru</h3>
              <p className="text-xs text-indigo-600/70">Mulai catatan keuangan baru untuk keluarga Anda.</p>
            </button>

            <button
              onClick={() => setSetupMode('join')}
              className="w-full p-6 bg-slate-50 text-slate-700 rounded-3xl border-2 border-slate-100 hover:border-slate-300 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-slate-600 text-white rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <h3 className="font-bold">Gabung ID Lama</h3>
              <p className="text-xs text-slate-600/70">Masukkan ID yang sudah dibuat oleh pasangan Anda.</p>
            </button>
          </div>
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

            {setupMode === 'join' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">ID Keuangan</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={householdId}
                    onChange={(e) => setHouseholdId(e.target.value)}
                    placeholder="Masukkan ID dari pasangan"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">ID Keuangan Anda</label>
                <div className="p-4 bg-slate-100 rounded-2xl font-mono text-center text-lg font-bold text-slate-900 tracking-widest border-2 border-dashed border-slate-200">
                  {householdId}
                </div>
                <p className="text-[10px] text-slate-500 text-center">
                  Simpan ID ini untuk dibagikan ke pasangan Anda nanti.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Tanggal Gajian</label>
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
              <p className="text-rose-500 text-xs bg-rose-50 p-3 rounded-xl">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSetupMode('choice')}
                className="flex-1 py-4 px-4 bg-slate-100 text-slate-700 font-medium rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isJoining || !householdId.trim() || !displayName.trim()}
                className="flex-[2] py-4 px-4 bg-indigo-600 text-white font-medium rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isJoining ? 'Memproses...' : setupMode === 'create' ? 'Buat Sekarang' : 'Gabung Sekarang'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
