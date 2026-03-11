import { useState, useEffect } from 'react';
import { auth, db, doc, setDoc, getDoc } from '../firebase';
import { motion } from 'motion/react';
import { User, Calendar, Save, CheckCircle2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function Settings({ householdId }: { householdId: string }) {
  const [displayName, setDisplayName] = useState('');
  const [payday, setPayday] = useState('25');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

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
          setPayday(String(householdDoc.data().payday || 25));
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
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName
      }, { merge: true });

      // Update household payday
      await setDoc(doc(db, 'households', householdId), {
        payday: parseInt(payday, 10)
      }, { merge: true });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `households/${householdId}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
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
    </div>
  );
}
