import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { supabase } from './supabase.ts';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sync Google Authenticated User with Supabase Session
 * Ensures supabase.auth.getSession() returns a valid active session
 */
export async function syncGoogleAuthWithSupabase(googleUser: User, credential: any) {
  const email = googleUser.email;
  if (!email) throw new Error("No email associated with Google account");

  // Strategy 1: Attempt Supabase ID Token Auth if ID token exists
  if (credential?.idToken) {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential.idToken,
      });

      if (data?.session && !error) {
        return data.session;
      }
    } catch (err) {
      console.warn("Supabase ID Token auth notice:", err);
    }
  }

  // Strategy 2: Create / Synchronize Supabase User Account Session
  const defaultPassword = `MTL-GoogleSync-${googleUser.uid.slice(0, 16)}!`;

  // Attempt login with synchronized password
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: defaultPassword,
  });

  if (signInData?.session && !signInError) {
    return signInData.session;
  }

  // If user does not exist in Supabase auth table, create user profile
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password: defaultPassword,
    options: {
      data: {
        username: googleUser.displayName || email.split('@')[0],
        full_name: googleUser.displayName || email.split('@')[0],
        avatar_url: googleUser.photoURL,
        google_uid: googleUser.uid,
      }
    }
  });

  if (signUpData?.session) {
    return signUpData.session;
  }

  if (signUpError) {
    // Retry login if user exists
    const { data: retrySignIn } = await supabase.auth.signInWithPassword({
      email,
      password: defaultPassword,
    });
    if (retrySignIn?.session) return retrySignIn.session;
  }

  return null;
}

export const googleSignIn = async (): Promise<{ user: User; accessToken: string; supabaseSession: any } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    const user = result.user;

    // Sync session with Supabase so supabase.auth.getSession() works seamlessly
    const supabaseSession = await syncGoogleAuthWithSupabase(user, credential);

    return { user, accessToken: cachedAccessToken, supabaseSession };
  } catch (error: any) {
    console.error('Google Sign in & Supabase sync error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("Logout error:", e);
  }
  cachedAccessToken = null;
};
