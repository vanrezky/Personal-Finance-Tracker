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
  ArrowRight,
  ChevronRight,
  KeyRound,
  LoaderCircle,
  Mail,
  Plus,
  UserRound,
  Users,
  WalletCards,
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
      return 'Jendela login ditutup sebelum proses selesai. Coba lagi ya.';
    case 'auth/cancelled-popup-request':
      return 'Ada permintaan login lain yang sempat dibatalkan. Ulangi sekali lagi.';
    case 'auth/network-request-failed':
      return 'Koneksi internet lagi tidak stabil. Coba lagi setelah jaringan membaik.';
    case 'auth/invalid-email':
      return 'Format email belum valid.';
    case 'auth/missing-password':
      return 'Password belum diisi.';
    case 'auth/weak-password':
      return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
    case 'auth/email-already-in-use':
      return 'Email ini sudah terdaftar. Silakan masuk atau gunakan metode lain yang sesuai.';
    case 'auth/account-exists-with-different-credential':
      return 'Email ini sudah terhubung dengan metode login lain.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email atau password belum cocok. Cek lagi, ya.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan login. Tunggu sebentar lalu coba lagi.';
    default:
      return error?.message || 'Terjadi kendala saat memproses login.';
  }
}

function LoadingSpinner() {
  return <LoaderCircle className="h-5 w-5 animate-spin" />;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.81 12.23c0-.72-.06-1.25-.19-1.8H12.2v3.4h5.53c-.11.84-.72 2.1-2.08 2.95l-.02.11 3.03 2.35.21.02c1.94-1.79 3.06-4.42 3.06-7.03Z" />
      <path fill="#34A853" d="M12.2 22c2.71 0 4.99-.9 6.65-2.44l-3.22-2.48c-.86.6-2.01 1.02-3.43 1.02-2.66 0-4.92-1.79-5.73-4.25l-.1.01-3.15 2.44-.03.1A10.04 10.04 0 0 0 12.2 22Z" />
      <path fill="#FBBC05" d="M6.47 13.85A6.17 6.17 0 0 1 6.13 12c0-.64.11-1.25.32-1.85l-.01-.12-3.18-2.48-.1.05A10 10 0 0 0 2 12c0 1.63.39 3.17 1.07 4.41l3.4-2.56Z" />
      <path fill="#EA4335" d="M12.2 5.9c1.78 0 2.99.77 3.68 1.42l2.69-2.62C17.17 3.4 14.91 2 12.2 2a10.04 10.04 0 0 0-9.01 5.59l3.3 2.55c.82-2.46 3.08-4.24 5.72-4.24Z" />
    </svg>
  );
}

function IntroIllustration() {
  return (
    <div className="relative mx-auto flex h-72 w-full max-w-[18rem] items-center justify-center">
      <div className="absolute inset-x-4 top-8 h-48 rounded-[2rem] bg-gradient-to-br from-violet-500 to-fuchsia-400 shadow-[0_25px_60px_rgba(151,103,218,0.35)]" />
      <div className="absolute left-4 top-0 h-48 w-40 rotate-[-9deg] rounded-[2rem] border border-white/60 bg-white/70 shadow-[0_18px_50px_rgba(109,93,184,0.18)] backdrop-blur-xl" />
      <div className="absolute right-4 top-12 h-48 w-40 rotate-[11deg] rounded-[2rem] border border-white/60 bg-white/80 shadow-[0_18px_50px_rgba(109,93,184,0.18)] backdrop-blur-xl" />
      <div className="relative z-10 w-[15.5rem] rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-[0_18px_55px_rgba(109,93,184,0.18)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-400">Moni</p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-[color:var(--moni-text)]">Ringkasan bulan ini</h3>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#f6f2ff] text-violet-500">
            <WalletCards className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-[1.6rem] bg-gradient-to-br from-violet-500 to-fuchsia-400 p-4 text-white">
          <p className="text-xs font-medium text-white/80">Total pengeluaran</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">Rp3,7 jt</p>
          <p className="mt-2 text-xs text-white/85">Lebih jelas dari bulan lalu • 4 kategori aktif</p>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-[1.2rem] bg-[#f7f4ff] px-4 py-3">
            <span className="text-sm text-[color:var(--moni-subtle)]">Makan & kopi</span>
            <span className="text-sm font-semibold text-[color:var(--moni-text)]">Rp680rb</span>
          </div>
          <div className="flex items-center justify-between rounded-[1.2rem] bg-[#fff8ee] px-4 py-3">
            <span className="text-sm text-[color:var(--moni-subtle)]">Transportasi</span>
            <span className="text-sm font-semibold text-[color:var(--moni-text)]">Rp420rb</span>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [welcomeStep, setWelcomeStep] = useState(0);

  const isBusy = loadingAction !== null;
  const requiresProfileCompletion = Boolean(user && !displayName.trim());
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
    for (let index = 0; index < 8; index += 1) {
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
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
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
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
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
    setWelcomeStep(0);
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
        { merge: true }
      );

      const profile = await loadUserProfile(result.user.uid);
      if (profile.currentHouseholdId) {
        onComplete(profile.currentHouseholdId);
        return;
      }

      setAuthScreen('post-login-choice');
    } catch (error: any) {
      setError(mapFirebaseAuthError(error));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmailSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const trimmedEmail = emailForm.email.trim();
    const trimmedDisplayName = emailForm.displayName.trim();

    if (!trimmedDisplayName) {
      setError('Nama tampilan perlu diisi agar pasangan atau teman mudah mengenali akun ini.');
      return;
    }

    if (emailForm.password !== emailForm.confirmPassword) {
      setError('Konfirmasi password belum sama.');
      return;
    }

    setLoadingAction('email-signup');
    try {
      const methods = await fetchSignInMethodsForEmail(auth, trimmedEmail);
      if (methods.length > 0) {
        setError('Email ini sudah pernah digunakan. Silakan masuk saja.');
        return;
      }

      const result = await createUserWithEmailAndPassword(auth, trimmedEmail, emailForm.password);
      await updateProfile(result.user, { displayName: trimmedDisplayName });
      setDisplayName(trimmedDisplayName);
      await syncUserProfile(result.user, trimmedDisplayName);
      setEmailForm(initialEmailForm);
      setAuthScreen('post-login-choice');
    } catch (error: any) {
      setError(mapFirebaseAuthError(error));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmailSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
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
    } catch (error: any) {
      setError(mapFirebaseAuthError(error));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!user || !displayName.trim()) {
      setError('Nama tampilan perlu diisi sebelum lanjut.');
      return;
    }

    setError('');
    setLoadingAction('profile');
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      await syncUserProfile(user, displayName.trim());
    } catch (error: any) {
      setError(mapFirebaseAuthError(error));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleJoinHousehold = async (event: React.FormEvent) => {
    event.preventDefault();
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
          throw new Error('ID keuangan tidak ditemukan. Pastikan kode yang Anda masukkan benar.');
        }

        const members = householdDoc.data().members || [];
        if (!members.includes(user.uid)) {
          await setDoc(householdRef, { members: [...members, user.uid] }, { merge: true });
        }
      } else {
        if (householdDoc.exists()) {
          const nextId = generateRandomId();
          setHouseholdId(nextId);
          throw new Error('ID household sedang bentrok. Kami sudah siapkan ID baru, silakan simpan lagi.');
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
        { merge: true }
      );

      onComplete(hid);
    } catch (error: any) {
      if (error.message?.includes('Missing or insufficient permissions') || error.message?.includes('permission-denied')) {
        handleFirestoreError(error, OperationType.WRITE, householdPath);
      }
      setError(error.message || 'Gagal memproses household. Silakan coba lagi.');
    } finally {
      setLoadingAction(null);
    }
  };

  const renderError = () =>
    error ? <p className="rounded-[1.3rem] border border-rose-100 bg-rose-50 px-4 py-3 text-left text-sm text-rose-500">{error}</p> : null;

  const renderAuthWelcome = () => {
    const introSlides = [
      {
        title: 'Cara mudah memantau pengeluaranmu',
        description: 'Pantau uang masuk, uang keluar, dan lihat gambaran bulan ini tanpa tenggelam di banyak card.',
      },
      {
        title: 'Masuk dengan cara yang paling nyaman',
        description: 'Lanjutkan dengan Google untuk yang serba cepat, atau gunakan email & password untuk akun pribadi.',
      },
    ];

    return (
      <div className="space-y-5 text-left">
        <motion.div key={welcomeStep} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} className="moni-card overflow-hidden p-6 sm:p-7">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] moni-hero text-white shadow-[0_12px_35px_rgba(151,103,218,0.28)]">
                <WalletCards className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-violet-400">Moni</p>
                <h2 className="text-lg font-semibold tracking-tight">Onboarding yang lebih hangat</h2>
              </div>
            </div>
            <div className="moni-pill">0{welcomeStep + 1}</div>
          </div>

          <IntroIllustration />

          <h3 className="mt-2 text-center text-[2rem] font-semibold leading-tight tracking-tight text-[color:var(--moni-text)]">
            {introSlides[welcomeStep].title}
          </h3>
          <p className="mx-auto mt-3 max-w-sm text-center text-base leading-7 text-[color:var(--moni-subtle)]">
            {introSlides[welcomeStep].description}
          </p>

          <div className="mt-7 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {introSlides.map((_, index) => (
                <span key={index} className={cn('h-2.5 rounded-full transition-all', welcomeStep === index ? 'w-8 bg-violet-400' : 'w-2.5 bg-violet-100')} />
              ))}
            </div>
            {welcomeStep === 0 ? (
              <button type="button" onClick={() => setWelcomeStep(1)} className="moni-primary-button px-5">
                Geser ke kanan <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={() => setAuthScreen('email-signin')} className="moni-primary-button px-5">
                Masuk sekarang <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>

        {welcomeStep === 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={handleGoogleLogin} disabled={isBusy} className="moni-card-soft flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 disabled:opacity-60">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white text-slate-700 shadow-[0_8px_20px_rgba(125,104,196,0.08)]">
                {loadingAction === 'google' ? <LoadingSpinner /> : <GoogleIcon />}
              </div>
              <div>
                <p className="text-sm font-semibold text-[color:var(--moni-text)]">Login dengan Google</p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--moni-subtle)]">Satu klik dan langsung siap dipakai.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                setAuthScreen('email-signin');
              }}
              disabled={isBusy}
              className="moni-card-soft flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#fff1f8] text-fuchsia-500 shadow-[0_8px_20px_rgba(125,104,196,0.08)]">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[color:var(--moni-text)]">Login email & password</p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--moni-subtle)]">Pakai email pribadi dengan password yang kamu buat sendiri.</p>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderEmailForm = (mode: 'signin' | 'signup') => {
    const isSignup = mode === 'signup';

    return (
      <form onSubmit={isSignup ? handleEmailSignUp : handleEmailSignIn} className="space-y-4 text-left">
        <button type="button" onClick={resetToWelcome} className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--moni-subtle)] transition hover:text-[color:var(--moni-text)]">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke onboarding
        </button>

        <div className="moni-card p-6 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-violet-400">Akses akun</p>
              <h2 className="mt-2 text-[1.7rem] font-semibold tracking-tight text-[color:var(--moni-text)]">
                {isSignup ? 'Daftar dengan email' : 'Masuk dengan email'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--moni-subtle)]">
                {isSignup ? 'Simpan nama tampilan biar mudah dikenali di transaksi household.' : 'Masukkan email dan password yang sudah terdaftar.'}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#fff1f8] text-fuchsia-500">
              <Mail className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Nama tampilan</label>
                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-300" />
                  <input type="text" required value={emailForm.displayName} onChange={(event) => updateEmailField('displayName', event.target.value)} placeholder="Contoh: Aulia" className="moni-input pl-12" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-300" />
                <input type="email" required value={emailForm.email} onChange={(event) => updateEmailField('email', event.target.value)} placeholder="nama@email.com" className="moni-input pl-12" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-300" />
                <input type="password" required value={emailForm.password} onChange={(event) => updateEmailField('password', event.target.value)} placeholder={isSignup ? 'Minimal 6 karakter' : 'Masukkan password Anda'} className="moni-input pl-12" />
              </div>
            </div>

            {isSignup && (
              <div className="space-y-2">
                <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Konfirmasi password</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-300" />
                  <input type="password" required value={emailForm.confirmPassword} onChange={(event) => updateEmailField('confirmPassword', event.target.value)} placeholder="Ulangi password Anda" className="moni-input pl-12" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <button type="submit" disabled={isBusy} className="moni-primary-button w-full justify-center">
              {loadingAction === (isSignup ? 'email-signup' : 'email-signin') ? <LoadingSpinner /> : <Mail className="h-5 w-5" />}
              {isSignup ? 'Buat akun sekarang' : 'Masuk sekarang'}
            </button>
            <button type="button" onClick={handleGoogleLogin} disabled={isBusy} className="moni-outline-button w-full justify-center rounded-[1.25rem] py-3.5">
              {loadingAction === 'google' ? <LoadingSpinner /> : <GoogleIcon />}
              Lanjutkan dengan Google
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-[color:var(--moni-subtle)]">
          {isSignup ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
          <button type="button" onClick={() => {
            setError('');
            setAuthScreen(isSignup ? 'email-signin' : 'email-signup');
          }} className="font-semibold text-violet-600 hover:text-violet-700">
            {isSignup ? 'Masuk di sini' : 'Daftar di sini'}
          </button>
        </div>
      </form>
    );
  };

  const renderHouseholdChoice = () => (
    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={handleStartCreate} className="moni-card-soft p-5 text-left transition hover:-translate-y-0.5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-violet-500 text-white shadow-[0_12px_32px_rgba(125,104,196,0.2)]">
            <Plus className="h-5 w-5" />
          </div>
          <ChevronRight className="h-5 w-5 text-violet-300" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-[color:var(--moni-text)]">Buat household baru</h3>
        <p className="mt-2 text-sm leading-6 text-[color:var(--moni-subtle)]">Mulai pencatatan baru dengan ID yang bisa kamu bagikan nanti.</p>
      </button>

      <button type="button" onClick={() => {
        setError('');
        setHouseholdId('');
        setSetupMode('join');
      }} className="moni-card-soft p-5 text-left transition hover:-translate-y-0.5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#fff1f8] text-fuchsia-500 shadow-[0_12px_32px_rgba(125,104,196,0.12)]">
            <Users className="h-5 w-5" />
          </div>
          <ChevronRight className="h-5 w-5 text-fuchsia-300" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-[color:var(--moni-text)]">Gabung household</h3>
        <p className="mt-2 text-sm leading-6 text-[color:var(--moni-subtle)]">Masukkan ID yang sudah dibuat pasangan atau teman serumah.</p>
      </button>
    </div>
  );

  const renderHouseholdForm = () => (
    <form onSubmit={handleJoinHousehold} className="space-y-4 text-left">
      <button type="button" onClick={() => {
        setError('');
        setSetupMode('choice');
      }} className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--moni-subtle)] transition hover:text-[color:var(--moni-text)]">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke pilihan household
      </button>

      <div className="moni-card p-6 sm:p-7">
        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Nama Anda</label>
            <input type="text" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Nama panggilan yang tampil di aplikasi" className="moni-input" />
          </div>

          {setupMode === 'join' ? (
            <div className="space-y-2">
              <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">ID household</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-300" />
                <input type="text" required value={householdId} onChange={(event) => setHouseholdId(event.target.value)} placeholder="Masukkan ID dari pasangan" className="moni-input pl-12" />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">ID household kamu</label>
              <div className="rounded-[1.4rem] border border-dashed border-violet-200 bg-[#f8f5ff] px-4 py-5 text-center font-mono text-lg font-bold tracking-[0.28em] text-[color:var(--moni-text)]">
                {householdId}
              </div>
              <p className="text-xs leading-5 text-[color:var(--moni-subtle)]">Simpan ID ini dan bagikan nanti supaya orang lain bisa ikut bergabung.</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="px-1 text-sm font-medium text-[color:var(--moni-subtle)]">Tanggal gajian</label>
            <input type="number" min="1" max="31" required value={payday} onChange={(event) => setPayday(event.target.value)} className="moni-input" />
            <p className="text-xs leading-5 text-[color:var(--moni-subtle)]">Dipakai untuk menghitung siklus bulan dan sisa menuju payday di dashboard.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => setSetupMode('choice')} className="flex-1 rounded-[1.25rem] bg-slate-100 px-4 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-200">Batal</button>
        <button type="submit" disabled={householdSubmitDisabled} className="moni-primary-button flex-[1.4] justify-center">
          {loadingAction === 'household' ? <LoadingSpinner /> : null}
          {setupMode === 'create' ? 'Buat sekarang' : 'Gabung sekarang'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-5 pb-2">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="moni-shell overflow-hidden px-4 py-6 sm:px-6 sm:py-7">
        <div className="mx-auto max-w-xl">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.4rem] moni-hero text-white shadow-[0_16px_40px_rgba(151,103,218,0.3)]">
              <WalletCards className="h-7 w-7" />
            </div>
            <h1 className="text-[2rem] font-semibold tracking-tight text-[color:var(--moni-text)]">Moni</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--moni-subtle)]">
              Catat uang bareng pasangan, teman, atau diri sendiri dengan tampilan yang lebih ramah dan gampang dipahami.
            </p>
          </div>

          {renderError()}

          <div className={cn('space-y-5', error && 'pt-1')}>
            {!user && authScreen === 'welcome' && renderAuthWelcome()}
            {!user && authScreen === 'email-signin' && renderEmailForm('signin')}
            {!user && authScreen === 'email-signup' && renderEmailForm('signup')}

            {user && authScreen === 'post-login-choice' && (
              <div className="space-y-5">
                <section className="moni-card p-6 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-violet-400">Siap lanjut</p>
                  <h2 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-[color:var(--moni-text)]">Halo, {greetingLabel} ✨</h2>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--moni-subtle)]">Pilih ingin membuat household baru atau langsung gabung ke household yang sudah ada.</p>
                </section>

                {requiresProfileCompletion && (
                  <section className="moni-card-soft p-5">
                    <div className="mb-4 text-left">
                      <h3 className="text-lg font-semibold tracking-tight text-[color:var(--moni-text)]">Lengkapi nama tampilan</h3>
                      <p className="mt-1 text-sm leading-6 text-[color:var(--moni-subtle)]">Nama ini akan muncul di transaksi dan memudahkan orang lain mengenali akunmu.</p>
                    </div>

                    <div className="space-y-3">
                      <input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Contoh: Nanda" className="moni-input" />
                      <button type="button" onClick={handleSaveDisplayName} disabled={loadingAction === 'profile' || !displayName.trim()} className="moni-primary-button w-full justify-center">
                        {loadingAction === 'profile' ? <LoadingSpinner /> : <UserRound className="h-5 w-5" />}
                        Simpan nama tampilan
                      </button>
                    </div>
                  </section>
                )}

                <section className="space-y-4 rounded-[1.8rem] border border-white/80 bg-white/55 p-4 backdrop-blur-xl md:p-5">
                  <div className="text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">Household flow</p>
                    <h3 className="mt-1 text-lg font-semibold tracking-tight text-[color:var(--moni-text)]">Tentukan langkah berikutnya</h3>
                  </div>

                  {setupMode === 'choice' ? renderHouseholdChoice() : renderHouseholdForm()}
                </section>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
