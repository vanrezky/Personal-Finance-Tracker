import { useEffect, useMemo, useState } from 'react';
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
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LogIn,
  Mail,
  Plus,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
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

export function AuthSetup({ onComplete }: { onComplete: (householdId: string) => void }) {
  const [user, setUser] = useState(auth.currentUser);
  const [authScreen, setAuthScreen] = useState<AuthScreen>(auth.currentUser ? 'post-login-choice' : 'welcome');
  const [setupMode, setSetupMode] = useState<SetupMode>('choice');
  const [householdId, setHouseholdId] = useState('');
  const [payday, setPayday] = useState('25');
  const [displayName, setDisplayName] = useState('');
  const [emailForm, setEmailForm] = useState<EmailFormState>(initialEmailForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    setShowPassword(false);
    setShowConfirmPassword(false);
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
      await setDoc(
        doc(db, path),
        buildUserProfileData(result.user, {
          displayName: resolvedName,
        }),
        { merge: true },
      );

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
      setShowPassword(false);
      setShowConfirmPassword(false);
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
      setShowPassword(false);
      setShowConfirmPassword(false);
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
          await setDoc(
            householdRef,
            {
              members: [...members, user.uid],
            },
            { merge: true },
          );
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
    error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-left text-sm text-rose-600">{error}</p> : null;

  const renderAuthWelcome = () => (
    <div className="space-y-4 text-left">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-2xl bg-slate-900 p-3 text-white">
            <LogIn className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Masuk dengan Google</h2>
            <p className="text-sm text-slate-500">Cepat, praktis, dan langsung siap dipakai.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isBusy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAction === 'google' ? <LoadingSpinner /> : <LogIn className="h-5 w-5" />}
          Lanjutkan dengan Google
        </button>
      </div>

      <div className="relative py-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-slate-200" />
        <span className="relative bg-white px-4">atau</span>
      </div>

      <div>
        <button
          type="button"
          onClick={() => {
            setError('');
            setAuthScreen('email-signin');
          }}
          disabled={isBusy}
          className="w-full rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-2xl bg-indigo-600 p-3 text-white">
              <Mail className="h-5 w-5" />
            </div>
            <ChevronRight className="h-5 w-5 text-indigo-400" />
          </div>
          <h3 className="font-semibold text-slate-900">Masuk dengan Email</h3>
          <p className="mt-1 text-sm text-slate-500">Gunakan email dan password untuk akun pribadi Anda.</p>
        </button>
      </div>
    </div>
  );

  const renderEmailForm = (mode: 'signin' | 'signup') => {
    const isSignup = mode === 'signup';

    return (
      <form onSubmit={isSignup ? handleEmailSignUp : handleEmailSignIn} className="space-y-4 text-left">
        <button
          type="button"
          onClick={resetToWelcome}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke pilihan login
        </button>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              {isSignup ? 'Buat akun dengan email' : 'Masuk dengan email'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isSignup
                ? 'Simpan nama tampilan agar pasangan Anda mudah mengenali akun ini.'
                : 'Masukkan email dan password yang sudah terdaftar.'}
            </p>
          </div>

          <div className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nama tampilan</label>
                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={emailForm.displayName}
                    onChange={(e) => updateEmailField('displayName', e.target.value)}
                    placeholder="Contoh: Aulia"
                    className="w-full rounded-2xl bg-slate-50 py-3 pl-12 pr-4 text-slate-900 outline-none ring-0 transition focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={emailForm.email}
                  onChange={(e) => updateEmailField('email', e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full rounded-2xl bg-slate-50 py-3 pl-12 pr-4 text-slate-900 outline-none ring-0 transition focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={emailForm.password}
                  onChange={(e) => updateEmailField('password', e.target.value)}
                  placeholder={isSignup ? 'Minimal 6 karakter' : 'Masukkan password Anda'}
                  className="w-full rounded-2xl bg-slate-50 py-3 pl-12 pr-12 text-slate-900 outline-none ring-0 transition focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isSignup && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Konfirmasi password</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={emailForm.confirmPassword}
                    onChange={(e) => updateEmailField('confirmPassword', e.target.value)}
                    placeholder="Ulangi password Anda"
                    className="w-full rounded-2xl bg-slate-50 py-3 pl-12 pr-12 text-slate-900 outline-none ring-0 transition focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === (isSignup ? 'email-signup' : 'email-signin') ? <LoadingSpinner /> : <Mail className="h-5 w-5" />}
            {isSignup ? 'Buat akun sekarang' : 'Masuk sekarang'}
          </button>
        </div>

        <div className="text-center text-sm text-slate-500">
          {isSignup ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
          <button
            type="button"
            onClick={() => {
              setError('');
              setAuthScreen(isSignup ? 'email-signin' : 'email-signup');
            }}
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {isSignup ? 'Masuk di sini' : 'Daftar di sini'}
          </button>
        </div>
      </form>
    );
  };

  const renderHouseholdChoice = () => (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleStartCreate}
        className="w-full rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="rounded-2xl bg-indigo-600 p-3 text-white">
            <Plus className="h-5 w-5" />
          </div>
          <ChevronRight className="h-5 w-5 text-indigo-400" />
        </div>
        <h3 className="font-bold text-slate-900">Buat ID Baru</h3>
        <p className="mt-1 text-sm text-slate-500">Mulai catatan keuangan baru untuk household Anda.</p>
      </button>

      <button
        type="button"
        onClick={() => {
          setError('');
          setHouseholdId('');
          setSetupMode('join');
        }}
        className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="rounded-2xl bg-slate-800 p-3 text-white">
            <Users className="h-5 w-5" />
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </div>
        <h3 className="font-bold text-slate-900">Gabung ID Lama</h3>
        <p className="mt-1 text-sm text-slate-500">Masukkan ID yang sudah dibuat pasangan atau anggota household lain.</p>
      </button>
    </div>
  );

  const renderHouseholdForm = () => (
    <form onSubmit={handleJoinHousehold} className="space-y-4 text-left">
      <button
        type="button"
        onClick={() => {
          setError('');
          setSetupMode('choice');
        }}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke pilihan household
      </button>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nama Anda</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nama panggilan yang tampil di aplikasi"
              className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {setupMode === 'join' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">ID Keuangan</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={householdId}
                  onChange={(e) => setHouseholdId(e.target.value)}
                  placeholder="Masukkan ID dari pasangan"
                  className="w-full rounded-2xl bg-slate-50 py-3 pl-12 pr-4 text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">ID Keuangan Anda</label>
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center font-mono text-lg font-bold tracking-[0.3em] text-slate-900">
                {householdId}
              </div>
              <p className="text-xs text-slate-500">Simpan ID ini lalu bagikan ke pasangan Anda agar bisa bergabung nanti.</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Tanggal gajian</label>
            <input
              type="number"
              min="1"
              max="31"
              required
              value={payday}
              onChange={(e) => setPayday(e.target.value)}
              className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500">Dipakai untuk menyusun siklus bulanan pada dashboard household.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setSetupMode('choice')}
          className="flex-1 rounded-2xl bg-slate-100 px-4 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={householdSubmitDisabled}
          className="flex-[1.4] rounded-2xl bg-indigo-600 px-4 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex items-center justify-center gap-2">
            {loadingAction === 'household' ? <LoadingSpinner /> : null}
            {setupMode === 'create' ? 'Buat Sekarang' : 'Gabung Sekarang'}
          </span>
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-amber-50/40 px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-xl shadow-slate-200/60 backdrop-blur md:p-8"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-slate-900 text-white shadow-lg shadow-indigo-200">
            <Wallet className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Moni Sync</h1>
          <p className="mt-2 text-sm text-slate-500 md:text-base">
            Catat keuangan bersama pasangan secara real-time dengan login Google atau email.
          </p>
        </div>

        {renderError()}

        <div className={cn('mt-4 space-y-5', error && 'pt-1')}>
          {!user && authScreen === 'welcome' && renderAuthWelcome()}
          {!user && authScreen === 'email-signin' && renderEmailForm('signin')}
          {!user && authScreen === 'email-signup' && renderEmailForm('signup')}

          {user && authScreen === 'post-login-choice' && (
            <div className="space-y-5">
              <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 text-left shadow-sm">
                <p className="text-sm font-medium text-indigo-600">Sudah berhasil masuk</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Halo, {greetingLabel} 👋</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Langkah berikutnya, pilih apakah ingin membuat household baru atau bergabung ke household yang sudah ada.
                </p>
              </section>

              {requiresProfileCompletion && (
                <section className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 text-left">
                    <h3 className="font-semibold text-slate-900">Lengkapi nama tampilan</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Nama ini akan tampil pada transaksi dan profil household Anda.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Contoh: Nanda"
                      className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveDisplayName}
                      disabled={loadingAction === 'profile' || !displayName.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3.5 font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingAction === 'profile' ? <LoadingSpinner /> : <UserRound className="h-5 w-5" />}
                      Simpan nama tampilan
                    </button>
                  </div>
                </section>
              )}

              <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-500">Flow household</p>
                  <h3 className="text-lg font-bold text-slate-900">Pilih langkah berikutnya</h3>
                </div>

                {setupMode === 'choice' ? renderHouseholdChoice() : renderHouseholdForm()}
              </section>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
