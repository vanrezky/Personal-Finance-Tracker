import type { User } from 'firebase/auth';

export type SupportedAuthProvider = 'google' | 'password' | 'anonymous';

interface UserProfileOptions {
  currentHouseholdId?: string;
  displayName?: string | null;
}

function getAuthProvider(user: User): SupportedAuthProvider {
  if (user.isAnonymous) {
    return 'anonymous';
  }

  if (user.providerData.some((provider) => provider.providerId === 'google.com')) {
    return 'google';
  }

  return 'password';
}

function getDisplayName(user: User, displayName?: string | null) {
  const fallbackName = user.isAnonymous ? 'Guest' : 'Pengguna';
  const candidates = [displayName, user.displayName, user.email, fallbackName];

  return candidates
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value));
}

export function buildUserProfileData(user: User, options: UserProfileOptions = {}) {
  const profile = {
    uid: user.uid,
    displayName: getDisplayName(user, options.displayName),
    authProvider: getAuthProvider(user),
    isGuest: user.isAnonymous,
    ...(options.currentHouseholdId ? { currentHouseholdId: options.currentHouseholdId } : {}),
    ...(user.email?.trim() ? { email: user.email.trim() } : {}),
  };

  return profile;
}
