import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  KeyRound,
  LoaderCircle,
  LogIn,
  Mail,
  Plus,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import {
  auth,
  createUserWithEmailAndPassword,
  db,
  doc,
  fetchSignInMethodsForEmail,
  getDoc,
  loginWithGoogle,
  setDoc,
  signInWithEmailAndPassword,
  updateProfile,
} from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { buildUserProfileData } from '../lib/userProfile';
import { cn } from '../lib/utils';

type AuthScreen = 'welcome' | 'email-signin' | 'email-signup' | 'post-login-choice';
type SetupMode = 'choice' | 'create' | 'join';
type LoadingAction = 'google' | 'email-signin' | 'email-signup' | 'profile' | 'household' | null;

type EmailFormState = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const initialEmailForm: EmailFormState = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function mapFirebaseAuthError(error: any) {
  const code = error?.code;

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Jendela login ditutup sebelum proses selesai. Silakan coba lagi.';
    case 'auth/cancelled-popup-request':
      return 'Permintaan login sebelumnya dibatalkan. Silakan ulangi sekali lagi.';
    case 'auth/network-request-failed':
      return 'Koneksi internet sedang bermasalah. Periksa jaringan Anda lalu coba lagi.';
    case 'auth/invalid-email':
      return 'Format email belum valid. Pastikan alamat email ditulis dengan benar.';
    case 'auth/missing-password':
      return 'Password belum diisi. Silakan masukkan password Anda.';
    case 'auth/weak-password':
      return 'Password terlalu lemah. Gunakan minimal 6 karakter agar lebih aman.';
    case 'auth/email-already-in-use':
      return 'Email ini sudah terdaftar. Silakan masuk atau gunakan metode login lain yang sesuai.';
    case 'auth/account-exists-with-different-credential':
      return 'Email ini sudah terhubung ke metode login lain. Coba masuk dengan metode yang pernah dipakai sebelumnya.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email atau password belum cocok. Periksa kembali lalu coba lagi.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan login. Tunggu sebentar lalu coba kembali.';
    default:
      return error?.message || 'Terjadi kendala saat memproses login. Silakan coba lagi.';
  }
}

function LoadingSpinner() {
  return <LoaderCircle className="h-5 w-5 animate-spin" />;
}

function SoftLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="h-4 w-2 rounded-full bg-pink-300" />
        <span className="h-4 w-2 rounded-full bg-indigo-500" />
      </div>
      <span className="text-xl font-bold tracking-tight text-slate-900">Monity</span>
    </div>
  );
}

function PhoneIllustration() {
  return (
    <div className="relative mx-auto h-[320px] w-[220px] rounded-[36px] border border-white/70 bg-white p-5 shadow-[0_30px_80px_rgba(99,102,241,0.18)]">
      <div className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-full bg-slate-200" />
      <div className="mt-6 space-y-4">
        <div className="rounded-[26px] bg-gradient-to-br from-indigo-500 to-indigo-400 p-4 text-white shadow-lg">
          <p className="text-xs font-medium text-white/80">Total pengeluaran</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">Rp3,7jt</p>
          <p className="mt-2 inline-flex rounded-full bg-white/15 px-2 py-1 text-[11px]">lebih rapi dari bulan lalu</p>
        </div>
        <div className="grid grid-cols-[1.1fr_0.9fr] gap-3">
          <div className="rounded-[24px] bg-slate-50 p-4 shadow-inner">
            <div className="flex h-24 items-end gap-2">
              <span className="h-8 w-6 rounded-xl bg-pink-300" />
              <span className="h-12 w-6 rounded-xl bg-amber-300" />
              <span className="h-16 w-6 rounded-xl bg-sky-300" />
              <span className="h-20 w-6 rounded-xl bg-indigo-300" />
            </div>
          </div>
          <div className="space-y-3 rounded-[24px] bg-slate-50 p-4 shadow-inner">
            <div className="h-9 rounded-2xl bg-pink-200/80" />
            <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
              <div className="h-2 rounded-full bg-slate-200" />
              <div className="h-2 w-4/5 rounded-full bg-sky-200" />
              <div className="h-2 w-2/3 rounded-full bg-indigo-200" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -left-5 top-24 rounded-full bg-white px-3 py-2 shadow-lg">
        <Wallet className="h-6 w-6 text-sky-500" />
      </div>
      <div className="absolute -right-4 bottom-20 rounded-full bg-white px-3 py-2 shadow-lg">
        <ArrowRight className="h-6 w-6 text-emerald-500" />
      </div>
    </div>
  );
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(148,163,184,0.16)] backdrop-blur-xl', className)}>{children}</div>;
}

export function AuthSetup({ onComplete }: { onComplete: (householdId: string) => void }) {
  const [user, setUser] = useState(auth.currentUser);
  const [authScreen, setAuthScreen] = useState<AuthScreen>(auth.currentUser ? 'post-login-choice' : 'welcome');
  const [setupMode, setSetupMode] = useState<SetupMode>('choice');
  const [householdId, setHouseholdId] = useState('');
  const [payday, setPayday] = useState('25');
  const [displayName, setDisplayName] = useState('');
  const [emailForm, setEmailForm] = useState<EmailFormState>(initialEmailForm);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [error, setError] = useState('');

  const isBusy = loadingAction !== null;
  const requiresProfileCompletion = !!user && !displayName.trim();
  const householdSubmitDisabled =
    isBusy ||
    !displayName.trim() ||
    !householdId.trim() ||
    (setupMode === 'create' && (!payday.trim() || Number(payday) < 1 || Number(payday) > 31));

  const greetingLabel = useMemo(() => {
    if (displayName.trim()) return displayName.trim();
    if (user?.email) return user.email;
    return 'Teman Finansial';
  }, [displayName, user?.email]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setDisplayName('');
        setAuthScreen('welcome');
        setSetupMode('choice');
        return;
      }

      const profile = await loadUserProfile(currentUser.uid);
      const resolvedName = currentUser.displayName || profile.displayName || '';

      setDisplayName(resolvedName);
      setAuthScreen('post-login-choice');
      setSetupMode('choice');

      if (profile.currentHouseholdId) {
        onComplete(profile.currentHouseholdId);
      }
    });

    return () => unsubscribe();
  }, [onComplete]);

  const generateRandomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < 8; i += 1) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  };

  const loadUserProfile = async (uid: string) => {
    const path = `users/${uid}`;

    try {
      const userDoc = await getDoc(doc(db, path));
      if (!userDoc.exists()) {
        return { displayName: '', currentHouseholdId: '' };
      }

      const data = userDoc.data();
      return {
        displayName: data.displayName || '',
        currentHouseholdId: data.currentHouseholdId || '',
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
      return { displayName: '', currentHouseholdId: '' };
    }
  };

  const syncUserProfile = async (currentUser = auth.currentUser, nextDisplayName?: string) => {
    if (!currentUser) return;

    const path = `users/${currentUser.uid}`;

    try {
      await setDoc(
        doc(db, path),
        buildUserProfileData(currentUser, {
          displayName: nextDisplayName ?? currentUser.displayName ?? displayName.trim(),
        }),
        { merge: true },
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const updateEmailField = (field: keyof EmailFormState, value: string) => {
    setEmailForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetToWelcome = () => {
    setError('');
    setEmailForm(initialEmailForm);
    setAuthScreen('welcome');
  };

  const handleStartCreate = () => {
    setError('');
    setHouseholdId(generateRandomId());
    setSetupMode('create');
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoadingAction('google');

    try {
      const result = await loginWithGoogle();
      const resolvedName = result.user.displayName || '';
      const path = `users/${result.user.uid}`;

      setDisplayName(resolvedName);
      await setDoc(doc(db, path), buildUserProfileData(result.user, { displayName: resolvedName }), { merge: true });

      const profile = await loadUserProfile(result.user.uid);
      if (profile.currentHouseholdId) {
        onComplete(profile.currentHouseholdId);
        return;
      }

      setAuthScreen('post-login-choice');
    } catch (err: any) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = emailForm.email.trim();
    const trimmedDisplayName = emailForm.displayName.trim();

    if (!trimmedDisplayName) {
      setError('Nama tampilan perlu diisi agar pasangan Anda mudah mengenali akun ini.');
      return;
    }

    if (emailForm.password !== emailForm.confirmPassword) {
      setError('Konfirmasi password belum sama. Pastikan kedua password cocok.');
      return;
    }

    setLoadingAction('email-signup');

    try {
      const methods = await fetchSignInMethodsForEmail(auth, trimmedEmail);
      if (methods.length > 0) {
        setError('Email ini sudah pernah digunakan. Silakan masuk atau gunakan metode login yang sesuai.');
        return;
      }

      const result = await createUserWithEmailAndPassword(auth, trimmedEmail, emailForm.password);
      await updateProfile(result.user, { displayName: trimmedDisplayName });
      setDisplayName(trimmedDisplayName);
      await syncUserProfile(result.user, trimmedDisplayName);
      setEmailForm(initialEmailForm);
      setAuthScreen('post-login-choice');
    } catch (err: any) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoadingAction('email-signin');

    try {
      const result = await signInWithEmailAndPassword(auth, emailForm.email.trim(), emailForm.password);
      const profile = await loadUserProfile(result.user.uid);
      const resolvedName = result.user.displayName || profile.displayName || '';

      setDisplayName(resolvedName);
      await syncUserProfile(result.user, resolvedName);
      setEmailForm(initialEmailForm);
      setAuthScreen('post-login-choice');
    } catch (err: any) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!user || !displayName.trim()) {
      setError('Nama tampilan perlu diisi sebelum melanjutkan.');
      return;
    }

    setError('');
    setLoadingAction('profile');

    try {
      await updateProfile(user, { displayName: displayName.trim() });
      await syncUserProfile(user, displayName.trim());
    } catch (err: any) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !householdId.trim()) return;

    const hid = householdId.trim().toLowerCase();
    const householdPath = `households/${hid}`;
    const userPath = `users/${user.uid}`;

    setLoadingAction('household');
    setError('');

    try {
      const householdRef = doc(db, 'households', hid);
      const householdDoc = await getDoc(householdRef);

      if (setupMode === 'join') {
        if (!householdDoc.exists()) {
          throw new Error('ID keuangan tidak ditemukan. Pastikan kode yang Anda masukkan sudah benar.');
        }

        const members = householdDoc.data().members || [];
        if (!members.includes(user.uid)) {
          await setDoc(householdRef, { members: [...members, user.uid] }, { merge: true });
        }
      } else {
        if (householdDoc.exists()) {
          const nextId = generateRandomId();
          setHouseholdId(nextId);
          throw new Error('ID baru sedang bentrok dengan data lain. Kami sudah siapkan ID baru, silakan simpan lagi.');
        }

        await setDoc(householdRef, {
          name: 'My Household',
          members: [user.uid],
          ownerUid: user.uid,
          createdAt: new Date().toISOString(),
          payday: parseInt(payday, 10),
        });
      }

      const resolvedDisplayName = displayName.trim() || user.displayName || user.email || '';

      if (resolvedDisplayName && user.displayName !== resolvedDisplayName) {
        await updateProfile(user, { displayName: resolvedDisplayName });
      }

      await setDoc(
        doc(db, userPath),
        buildUserProfileData(user, {
          currentHouseholdId: hid,
          displayName: resolvedDisplayName,
        }),
        { merge: true },
      );

      onComplete(hid);
    } catch (err: any) {
      if (err.message?.includes('Missing or insufficient permissions') || err.message?.includes('permission-denied')) {
        handleFirestoreError(err, OperationType.WRITE, householdPath);
      }
      setError(err.message || 'Gagal memproses ID keuangan. Silakan coba lagi.');
    } finally {
      setLoadingAction(null);
    }
  };

  const renderError = () =>
    error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null;

  const renderWelcome = () => (
    <div className="space-y-5">
      <SectionCard className="overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,241,255,0.92))]">
        <div className="mb-5 flex items-center justify-between">
          <SoftLogo />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">01 / 02</span>
        </div>
        <PhoneIllustration />
        <div className="mt-6 text-center">
          <h2 className="text-3xl font-bold leading-tight text-slate-900">Cara mudah memantau pengeluaranmu</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Kelola masa depan finansial dengan tampilan yang lebih tenang, fokus pada informasi penting, dan nyaman dipakai setiap hari.</p>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          </div>
          <button
            type="button"
            onClick={() => {
              setError('');
              setAuthScreen('email-signin');
            }}
            className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-pink-400 to-pink-500 text-white shadow-[0_14px_30px_rgba(244,114,182,0.35)]"
            aria-label="Lanjut ke login"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </SectionCard>

      <SectionCard className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-400">Quick access</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Masuk lebih cepat</h3>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-300" />
        </div>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isBusy}
          className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-slate-900 px-4 py-4 font-semibold text-white disabled:opacity-60"
        >
          {loadingAction === 'google' ? <LoadingSpinner /> : <LogIn className="h-5 w-5" />}
          Lanjutkan dengan Google
        </button>
        <p className="text-center text-xs text-slate-500">Atau ketuk panah di atas untuk masuk dengan email & password.</p>
      </SectionCard>
    </div>
  );

  const renderEmailForm = (mode: 'signin' | 'signup') => {
    const isSignup = mode === 'signup';

    return (
      <form onSubmit={isSignup ? handleEmailSignUp : handleEmailSignIn} className="space-y-5">
        <SectionCard className="space-y-5">
          <div className="flex items-center justify-between">
            <button type="button" onClick={resetToWelcome} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </button>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">02 / 02</span>
          </div>

          <div className="space-y-2">
            <SoftLogo />
            <h2 className="text-2xl font-bold text-slate-900">{isSignup ? 'Buat akun baru' : 'Masuk ke akun kamu'}</h2>
            <p className="text-sm leading-6 text-slate-500">
              {isSignup
                ? 'Gunakan email pribadi agar sinkronisasi keluarga tetap mudah dan aman.'
                : 'Masukkan email dan password untuk lanjut ke dashboard keuanganmu.'}
            </p>
          </div>

          {isSignup && (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Nama tampilan</span>
              <div className="relative">
                <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={emailForm.displayName}
                  onChange={(e) => updateEmailField('displayName', e.target.value)}
                  placeholder="Contoh: Aulia"
                  className="w-full rounded-[22px] bg-slate-50 py-4 pl-12 pr-4 text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </label>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={emailForm.email}
                onChange={(e) => updateEmailField('email', e.target.value)}
                placeholder="nama@email.com"
                className="w-full rounded-[22px] bg-slate-50 py-4 pl-12 pr-4 text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={emailForm.password}
                onChange={(e) => updateEmailField('password', e.target.value)}
                placeholder={isSignup ? 'Minimal 6 karakter' : 'Masukkan password'}
                className="w-full rounded-[22px] bg-slate-50 py-4 pl-12 pr-4 text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </label>

          {isSignup && (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Konfirmasi password</span>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={emailForm.confirmPassword}
                  onChange={(e) => updateEmailField('confirmPassword', e.target.value)}
                  placeholder="Ulangi password"
                  className="w-full rounded-[22px] bg-slate-50 py-4 pl-12 pr-4 text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </label>
          )}

          <button type="submit" disabled={isBusy} className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-slate-900 px-4 py-4 font-semibold text-white disabled:opacity-60">
            {loadingAction === (isSignup ? 'email-signup' : 'email-signin') ? <LoadingSpinner /> : <Mail className="h-5 w-5" />}
            {isSignup ? 'Buat akun & lanjutkan' : 'Masuk dengan email'}
          </button>

          <button type="button" onClick={handleGoogleLogin} disabled={isBusy} className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-slate-200 bg-white px-4 py-4 font-semibold text-slate-700 disabled:opacity-60">
            {loadingAction === 'google' ? <LoadingSpinner /> : <LogIn className="h-5 w-5" />}
            Masuk dengan Google
          </button>
        </SectionCard>

        <SectionCard className="text-center">
          <p className="text-sm text-slate-500">
            {isSignup ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <button
              type="button"
              onClick={() => {
                setError('');
                setAuthScreen(isSignup ? 'email-signin' : 'email-signup');
              }}
              className="font-semibold text-indigo-600"
            >
              {isSignup ? 'Masuk di sini' : 'Daftar sekarang'}
            </button>
          </p>
        </SectionCard>
      </form>
    );
  };

  const renderHouseholdChoice = () => (
    <div className="space-y-5">
      <SectionCard className="space-y-4 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,244,255,0.96))]">
        <div className="flex items-center justify-between">
          <SoftLogo />
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600">Siap dipakai</span>
        </div>
        <div>
          <p className="text-sm text-slate-500">Halo, {greetingLabel}</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Pilih cara mulai yang paling mudah</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Buat ruang keuangan baru untuk keluarga atau gabung ke ID yang sudah ada. Fokusnya tetap simpel: catatan penting dulu.</p>
        </div>
        {requiresProfileCompletion && (
          <div className="space-y-3 rounded-[24px] bg-slate-50 p-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Lengkapi nama tampilan</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Nama yang tampil di transaksi"
                className="w-full rounded-[20px] bg-white px-4 py-3 text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-400"
              />
            </label>
            <button type="button" onClick={handleSaveDisplayName} disabled={loadingAction === 'profile'} className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60">
              {loadingAction === 'profile' ? <LoadingSpinner /> : <UserRound className="h-5 w-5" />}
              Simpan nama
            </button>
          </div>
        )}
      </SectionCard>

      {setupMode === 'choice' ? (
        <div className="space-y-4">
          <button type="button" onClick={handleStartCreate} className="w-full text-left">
            <SectionCard className="transition hover:-translate-y-0.5 hover:border-indigo-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] bg-indigo-100 text-indigo-600">
                    <Plus className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Buat ruang keuangan baru</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Cocok kalau kamu ingin mulai dari nol dengan tampilan rapi dan payday yang bisa diatur.</p>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 text-slate-300" />
              </div>
            </SectionCard>
          </button>

          <button
            type="button"
            onClick={() => {
              setError('');
              setSetupMode('join');
              setHouseholdId('');
            }}
            className="w-full text-left"
          >
            <SectionCard className="transition hover:-translate-y-0.5 hover:border-pink-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] bg-pink-100 text-pink-500">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Gabung ke ID keluarga</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Masukkan ID yang dibagikan pasangan atau anggota keluarga untuk melihat catatan yang sama.</p>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 text-slate-300" />
              </div>
            </SectionCard>
          </button>
        </div>
      ) : (
        <form onSubmit={handleJoinHousehold} className="space-y-4">
          <SectionCard className="space-y-4">
            <button type="button" onClick={() => setSetupMode('choice')} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </button>

            <div>
              <h3 className="text-xl font-bold text-slate-900">{setupMode === 'create' ? 'Buat ruang keuangan' : 'Gabung ke ruang keuangan'}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {setupMode === 'create'
                  ? 'Kami siapkan struktur yang ringan. Kamu tinggal tentukan payday dan lanjut mulai mencatat.'
                  : 'Tempel ID keluarga yang kamu terima untuk langsung sinkron dengan data yang sama.'}
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Nama tampilan</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Contoh: Aulia"
                className="w-full rounded-[22px] bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-400"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">ID keuangan</span>
              <input
                type="text"
                value={householdId}
                onChange={(event) => setHouseholdId(event.target.value.toLowerCase())}
                className="w-full rounded-[22px] bg-slate-50 px-4 py-4 font-mono text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-400"
                placeholder="contoh: ab12cd34"
              />
            </label>

            {setupMode === 'create' && (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Tanggal payday</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={payday}
                  onChange={(event) => setPayday(event.target.value)}
                  className="w-full rounded-[22px] bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-400"
                />
              </label>
            )}

            <button type="submit" disabled={householdSubmitDisabled} className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-slate-900 px-4 py-4 font-semibold text-white disabled:opacity-60">
              {loadingAction === 'household' ? <LoadingSpinner /> : setupMode === 'create' ? <Plus className="h-5 w-5" /> : <Users className="h-5 w-5" />}
              {setupMode === 'create' ? 'Buat & masuk' : 'Gabung sekarang'}
            </button>
          </SectionCard>
        </form>
      )}
    </div>
  );

  return (
    <div className="space-y-4 pb-3">
      {renderError()}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${authScreen}-${setupMode}`}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.22 }}
        >
          {authScreen === 'welcome' && renderWelcome()}
          {authScreen === 'email-signin' && renderEmailForm('signin')}
          {authScreen === 'email-signup' && renderEmailForm('signup')}
          {authScreen === 'post-login-choice' && renderHouseholdChoice()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
