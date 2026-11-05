import { Calendar, Check, CheckCircle2, Copy, LogOut, Save, User, Users, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Skeleton } from './Skeleton';

export interface HouseholdJoinRequest {
  id: string;
  userUid: string;
  displayName: string;
  createdAt: string;
}

interface SettingsViewProps {
  displayName: string;
  payday: string;
  householdId: string;
  isOwner: boolean;
  joinRequests: HouseholdJoinRequest[];
  reviewingJoinRequestUid: string | null;
  joinRequestError: string;
  saving: boolean;
  success: boolean;
  copied: boolean;
  onDisplayNameChange: (value: string) => void;
  onPaydayChange: (value: string) => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onCopyHouseholdId: () => void;
  onReviewJoinRequest: (userUid: string, status: 'approved' | 'denied') => void;
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
      <form onSubmit={onSave} className="space-y-6">
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
        Bagikan ID ini. Pemilik household harus menyetujui permintaan sebelum anggota baru dapat melihat catatan.
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

function JoinRequestsCard({ joinRequests, reviewingJoinRequestUid, joinRequestError, onReviewJoinRequest }: Pick<SettingsViewProps, 'joinRequests' | 'reviewingJoinRequestUid' | 'joinRequestError' | 'onReviewJoinRequest'>) {
  return (
    <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900">Permintaan bergabung</h3>
          <p className="mt-1 text-xs text-slate-500">Tinjau siapa yang dapat mengakses data household.</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{joinRequests.length}</span>
      </div>
      {joinRequestError && <p role="alert" className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{joinRequestError}</p>}
      {joinRequests.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Belum ada permintaan baru.</p>
      ) : (
        <ul className="space-y-3">
          {joinRequests.map((request) => (
            <li key={request.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{request.displayName}</p>
                <p className="truncate text-[11px] text-slate-400">{request.userUid}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" aria-label={`Setujui ${request.displayName}`} disabled={reviewingJoinRequestUid !== null} onClick={() => onReviewJoinRequest(request.userUid, 'approved')} className="rounded-xl bg-emerald-600 p-2 text-white disabled:opacity-50"><Check className="h-4 w-4" /></button>
                <button type="button" aria-label={`Tolak ${request.displayName}`} disabled={reviewingJoinRequestUid !== null} onClick={() => onReviewJoinRequest(request.userUid, 'denied')} className="rounded-xl bg-rose-100 p-2 text-rose-700 disabled:opacity-50"><X className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
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
      {props.isOwner && <JoinRequestsCard joinRequests={props.joinRequests} reviewingJoinRequestUid={props.reviewingJoinRequestUid} joinRequestError={props.joinRequestError} onReviewJoinRequest={props.onReviewJoinRequest} />}
      <SettingsFooter onLogout={props.onLogout} />
    </div>
  );
}
