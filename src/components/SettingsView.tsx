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
      <Skeleton className="h-44 w-full rounded-[1.8rem]" />
      <Skeleton className="h-48 w-full rounded-[1.8rem]" />
      <Skeleton className="h-16 w-full rounded-[1.4rem]" />
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
    <div className="space-y-5 pb-6">
      <section className="moni-card p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">Pengaturan</p>
        <h2 className="mt-2 text-[1.9rem] font-semibold tracking-tight text-[color:var(--moni-text)]">Profil & preferensi household</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-[color:var(--moni-subtle)]">Atur nama tampilan, tanggal gajian, dan bagikan ID household dengan tampilan yang lebih ringan.</p>
      </section>

      <section className="moni-card p-5 sm:p-6">
        <form onSubmit={onSave} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 px-1 text-sm font-medium text-[color:var(--moni-subtle)]">
                <User className="h-4 w-4 text-violet-400" /> Nama tampilan
              </label>
              <input type="text" required value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} className="moni-input" />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 px-1 text-sm font-medium text-[color:var(--moni-subtle)]">
                <Calendar className="h-4 w-4 text-violet-400" /> Tanggal gajian
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                disabled={!isOwner}
                value={payday}
                onChange={(event) => onPaydayChange(event.target.value)}
                className={cn('moni-input', !isOwner && 'cursor-not-allowed opacity-60')}
              />
              <p className="px-1 text-xs leading-5 text-[color:var(--moni-subtle)]">
                {!isOwner ? 'Hanya pemilik household yang bisa mengubah tanggal gajian.' : 'Tanggal ini dipakai untuk menghitung siklus bulanan di dashboard.'}
              </p>
            </div>
          </div>

          <button type="submit" disabled={saving} className="moni-primary-button w-full justify-center">
            {saving ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : success ? (
              <>
                <CheckCircle2 className="h-5 w-5" /> Tersimpan
              </>
            ) : (
              <>
                <Save className="h-5 w-5" /> Simpan perubahan
              </>
            )}
          </button>
        </form>
      </section>

      <section className="moni-card-soft p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#fff1f8] text-fuchsia-500">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[color:var(--moni-text)]">ID household</h3>
            <p className="text-sm leading-6 text-[color:var(--moni-subtle)]">Bagikan kode ini ke pasangan atau teman agar bisa melihat catatan yang sama.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-[1.35rem] border border-white/80 bg-white px-4 py-4 text-center font-mono text-lg font-semibold tracking-[0.25em] text-[color:var(--moni-text)] shadow-[0_10px_30px_rgba(125,104,196,0.08)]">
            {householdId}
          </div>
          <button onClick={onCopyHouseholdId} className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-white text-violet-500 shadow-[0_10px_30px_rgba(125,104,196,0.08)] transition hover:-translate-y-0.5" title="Salin ID">
            {copied ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
      </section>

      <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-[1.5rem] border border-rose-100 bg-rose-50 px-6 py-4 font-semibold text-rose-500 transition hover:bg-rose-100">
        <LogOut className="h-5 w-5" /> Keluar dari akun
      </button>
    </div>
  );
}
