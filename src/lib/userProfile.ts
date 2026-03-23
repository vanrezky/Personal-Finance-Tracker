import type { User } from 'firebase/auth';

export type SupportedAuthProvider = 'google' | 'password';

interface UserProfileOptions {
  currentHouseholdId?: string;
  displayName?: string | null;
}

function getAuthProvider(user: User): SupportedAuthProvider {
  if (user.providerData.some((provider) => provider.providerId === 'google.com')) {
    return 'google';
  }

  return 'password';
}

function getDisplayName(user: User, displayName?: string | null) {
  const candidates = [displayName, user.displayName, user.email, 'Pengguna'];

  return candidates
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value));
}

export function buildUserProfileData(user: User, options: UserProfileOptions = {}) {
  const profile = {
    uid: user.uid,
    displayName: getDisplayName(user, options.displayName),
    authProvider: getAuthProvider(user),
    ...(options.currentHouseholdId ? { currentHouseholdId: options.currentHouseholdId } : {}),
    ...(user.email?.trim() ? { email: user.email.trim() } : {}),
  };

  return profile;
}
