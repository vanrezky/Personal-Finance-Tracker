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
    <div className="space-y-6">
      <div className="space-y-6 rounded-3xl border border-slate-100 bg-white p-6">
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

function SettingsFormSection({
  displayName,
  payday,
  isOwner,
  saving,
  success,
  onDisplayNameChange,
  onPaydayChange,
  onSave,
}: Omit<SettingsViewProps, 'householdId' | 'copied' | 'onCopyHouseholdId' | 'onLogout'>) {
  return (
    <div className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-500">Akun</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Pengaturan</h2>

      <form onSubmit={onSave} className="mt-6 space-y-6">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <User className="h-4 w-4 text-indigo-600" />
            Nama Tampilan
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            className="w-full rounded-2xl border-none bg-slate-50 px-4 py-3 text-slate-900 transition-shadow focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Calendar className="h-4 w-4 text-indigo-600" />
            Tanggal Gajian
          </label>
          <p className="mb-1 text-[10px] text-slate-500">
            Siklus bulanan di halaman utama akan dimulai dari tanggal ini.
            {!isOwner && (
              <span className="mt-1 block font-medium text-rose-500">
                * Hanya pemilik ID yang bisa mengubah tanggal gajian.
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
            onChange={(event) => onPaydayChange(event.target.value)}
            className={cn(
              'w-full rounded-2xl border-none bg-slate-50 px-4 py-3 text-slate-900 transition-shadow focus:ring-2 focus:ring-indigo-500',
              !isOwner && 'cursor-not-allowed opacity-60'
            )}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
        >
          {saving ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : success ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Perubahan tersimpan
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Simpan perubahan
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function HouseholdShareCard({ householdId, copied, onCopyHouseholdId }: Pick<SettingsViewProps, 'householdId' | 'copied' | 'onCopyHouseholdId'>) {
  return (
    <div className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="mb-2 flex items-center gap-2 font-bold text-indigo-700">
        <Users className="h-5 w-5" />
        <h3>ID keuangan keluarga</h3>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Bagikan ID ini ke pasangan atau anggota rumah agar mereka bisa masuk ke catatan keuangan yang sama.
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center font-mono font-bold tracking-widest text-slate-900">
          {householdId}
        </div>
        <button
          onClick={onCopyHouseholdId}
          className="relative rounded-2xl bg-slate-950 p-4 text-white transition-colors hover:bg-slate-800"
          title="Salin ID"
        >
          {copied ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <Copy className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}

function SettingsFooter({ onLogout }: Pick<SettingsViewProps, 'onLogout'>) {
  return (
    <div className="pt-4">
      <button
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-3xl border border-rose-100 bg-rose-50 px-6 py-4 font-bold text-rose-600 transition-colors hover:bg-rose-100"
      >
        <LogOut className="h-5 w-5" />
        Keluar dari akun
      </button>
      <p className="mt-4 text-center text-[10px] text-slate-400">Moni v1.0.0</p>
    </div>
  );
}

export function SettingsView(props: SettingsViewProps) {
  return (
    <div className="space-y-6 pb-10">
      <SettingsFormSection {...props} />
      <HouseholdShareCard householdId={props.householdId} copied={props.copied} onCopyHouseholdId={props.onCopyHouseholdId} />
      <SettingsFooter onLogout={props.onLogout} />
    </div>
  );
}
