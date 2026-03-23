import { useState, useEffect } from 'react';
import { auth, db, doc, setDoc, getDoc } from '../firebase';
import { motion } from 'motion/react';
import { User, Calendar, Save, CheckCircle2, Copy, Users, LogOut } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { buildUserProfileData } from '../lib/userProfile';
import { cn } from '../lib/utils';
import { Skeleton } from './Skeleton';

export function Settings({ householdId, onLogout }: { householdId: string, onLogout: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [payday, setPayday] = useState('25');
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setDisplayName(userDoc.data().displayName || '');
        }

        const householdDoc = await getDoc(doc(db, 'households', householdId));
        if (householdDoc.exists()) {
          const data = householdDoc.data();
          setPayday(String(data.payday || 25));
          setOwnerUid(data.ownerUid || null);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [householdId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setSaving(true);
    setSuccess(false);

    try {
      // Update user profile
      await setDoc(doc(db, 'users', auth.currentUser.uid), buildUserProfileData(auth.currentUser, {
        displayName,
      }), { merge: true });

      // Only owner can update household settings
      if (isOwner) {
        await setDoc(doc(db, 'households', householdId), {
          payday: parseInt(payday, 10)
        }, { merge: true });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `households/${householdId}`);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(householdId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOwner = auth.currentUser?.uid === ownerUid;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-6">
          <Skeleton className="h-7 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Pengaturan</h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              Nama Tampilan
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Tanggal Gajian
            </label>
            <p className="text-[10px] text-slate-500 mb-1">
              Siklus bulanan di Dashboard akan dimulai dari tanggal ini.
              {!isOwner && (
                <span className="block text-rose-500 font-medium mt-1">
                  * Hanya pemilik (pembuat ID) yang bisa mengubah tanggal gajian.
                </span>
              )}
            </p>
            <input
              type="number"
              min="1"
              max="31"
              required
              disabled={!isOwner}
              value={payday}
              onChange={(e) => setPayday(e.target.value)}
              className={cn(
                "w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-shadow",
                !isOwner && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : success ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Tersimpan
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Simpan Perubahan
              </>
            )}
          </button>
        </form>
      </div>

      <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
        <div className="flex items-center gap-2 text-indigo-700 font-bold mb-2">
          <Users className="w-5 h-5" />
          <h3>ID Keuangan Keluarga</h3>
        </div>
        <p className="text-xs text-indigo-600/70 mb-4">
          Bagikan ID ini kepada pasangan Anda agar mereka dapat bergabung dan melihat catatan keuangan yang sama.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white p-4 rounded-2xl font-mono text-center font-bold text-slate-900 tracking-widest border border-indigo-200">
            {householdId}
          </div>
          <button
            onClick={copyToClipboard}
            className="p-4 bg-white text-indigo-600 rounded-2xl border border-indigo-200 hover:bg-indigo-50 transition-colors relative"
            title="Salin ID"
          >
            {copied ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Copy className="w-6 h-6" />}
          </button>
        </div>
      </div>
      <div className="pt-4">
        <button
          onClick={onLogout}
          className="w-full py-4 px-6 bg-rose-50 text-rose-600 rounded-3xl font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-2 border border-rose-100"
        >
          <LogOut className="w-5 h-5" />
          Keluar dari Akun
        </button>
        <p className="text-center text-[10px] text-slate-400 mt-4">
          Finance Sync v1.0.0
        </p>
      </div>
    </div>
  );
}
