import { Calendar, CheckCircle2, Copy, LogOut, Save, User, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { Skeleton } from './Skeleton';

interface SettingsViewProps {
  displayName: string;
  payday: string;
  householdId: string;
  isOwner: boolean;
  saving: boolean;
  success: boolean;
  copied: boolean;
  onDisplayNameChange: (value: string) => void;
  onPaydayChange: (value: string) => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onCopyHouseholdId: () => void;
  onLogout: () => void;
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-56 w-full rounded-[32px]" />
      <Skeleton className="h-40 w-full rounded-[32px]" />
      <Skeleton className="h-16 w-full rounded-[28px]" />
    </div>
  );
}

export function SettingsView({
  displayName,
  payday,
  householdId,
  isOwner,
  saving,
  success,
  copied,
  onDisplayNameChange,
  onPaydayChange,
  onSave,
  onCopyHouseholdId,
  onLogout,
}: SettingsViewProps) {
  return (
    <div className="space-y-5 pb-8">
      <section className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(148,163,184,0.16)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-400">Profil</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Atur identitas dan siklus gajian</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Bagian ini dibuat lebih ringkas supaya pengaturan yang benar-benar penting mudah ditemukan.</p>

        <form onSubmit={onSave} className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <User className="h-4 w-4 text-indigo-500" /> Nama tampilan
            </span>
            <input
              type="text"
              required
              value={displayName}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              className="w-full rounded-[22px] bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Calendar className="h-4 w-4 text-pink-500" /> Tanggal payday
            </span>
            <input
              type="number"
              min="1"
              max="31"
              required
              disabled={!isOwner}
              value={payday}
              onChange={(event) => onPaydayChange(event.target.value)}
              className={cn('w-full rounded-[22px] bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-400', !isOwner && 'cursor-not-allowed opacity-60')}
            />
            <p className="text-xs leading-5 text-slate-500">
              Dashboard akan memakai tanggal ini sebagai awal siklus bulanan.
              {!isOwner ? ' Saat ini hanya pemilik ruang keuangan yang bisa mengubahnya.' : ''}
            </p>
          </label>

          <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-slate-900 px-4 py-4 font-semibold text-white disabled:opacity-60">
            {saving ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : success ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Tersimpan
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Simpan perubahan
              </>
            )}
          </button>
        </form>
      </section>

      <section className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(148,163,184,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-400">Family access</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">ID ruang keuangan</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Bagikan ID ini jika ingin menghubungkan pasangan atau anggota keluarga lain ke data yang sama.</p>
          </div>
          <div className="rounded-[20px] bg-pink-50 p-3 text-pink-500">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex-1 rounded-[22px] bg-slate-50 px-4 py-4 text-center font-mono text-sm font-bold uppercase tracking-[0.24em] text-slate-800">
            {householdId}
          </div>
          <button onClick={onCopyHouseholdId} className="rounded-[22px] bg-slate-900 p-4 text-white transition hover:bg-slate-800" title="Salin ID">
            {copied ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
      </section>

      <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-[28px] border border-rose-100 bg-rose-50 px-6 py-4 font-semibold text-rose-600 shadow-sm">
        <LogOut className="h-5 w-5" /> Keluar dari akun
      </button>
    </div>
  );
}
