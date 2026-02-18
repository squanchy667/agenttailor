import { type ReactNode } from 'react';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  useAuth,
  useClerk,
  useUser,
} from '@clerk/clerk-react';

/**
 * Auth abstraction layer — switches between local mode and Clerk
 * based on VITE_AUTH_MODE env var.
 *
 * Local mode: no login, auto-authenticated, null tokens (server handles it).
 * Clerk mode: full Clerk auth with publishable key.
 */

export const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE as string) ?? 'local';
const isLocal = AUTH_MODE !== 'clerk';

// ── Local user shape (mirrors Clerk's useUser().user) ──

const LOCAL_USER = {
  id: 'local-user',
  firstName: 'Local',
  lastName: 'User',
  fullName: 'Local User',
  primaryEmailAddress: { emailAddress: 'local@agenttailor.dev' },
  imageUrl: null as string | null,
};

// ── AuthProvider ──

function LocalAuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
  if (!key) {
    throw new Error('VITE_CLERK_PUBLISHABLE_KEY is required when VITE_AUTH_MODE=clerk');
  }
  return <ClerkProvider publishableKey={key}>{children}</ClerkProvider>;
}

export const AuthProvider = isLocal ? LocalAuthProvider : ClerkAuthProvider;

// ── ProtectedRoute ──

function LocalProtectedRoute({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function ClerkProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export const ProtectedRoute = isLocal ? LocalProtectedRoute : ClerkProtectedRoute;

// ── useAuthToken (replaces useAuth().getToken) ──

function localUseAuthToken(): () => Promise<string | null> {
  return async () => null;
}

function clerkUseAuthToken(): () => Promise<string | null> {
  const { getToken } = useAuth();
  return getToken;
}

export const useAuthToken: () => () => Promise<string | null> = isLocal
  ? localUseAuthToken
  : clerkUseAuthToken;

// ── useCurrentUser (replaces useUser()) ──

function localUseCurrentUser() {
  return { user: LOCAL_USER, isLoaded: true as const };
}

function clerkUseCurrentUser() {
  return useUser();
}

export const useCurrentUser = isLocal ? localUseCurrentUser : clerkUseCurrentUser;

// ── useSignOut (replaces useClerk().signOut) ──

function localUseSignOut(): () => Promise<void> {
  return async () => {
    /* no-op */
  };
}

function clerkUseSignOut(): () => Promise<void> {
  const { signOut } = useClerk();
  return async () => {
    await signOut();
  };
}

export const useSignOut: () => () => Promise<void> = isLocal
  ? localUseSignOut
  : clerkUseSignOut;
