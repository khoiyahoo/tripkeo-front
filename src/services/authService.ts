import {
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
  signInWithPopup,
  unlink,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = (): Promise<void> =>
  signInWithPopup(auth, googleProvider).then(() => undefined);

export const signOut = (): Promise<void> => firebaseSignOut(auth);

export const linkWithGoogle = (): Promise<void> => {
  if (!auth.currentUser) return Promise.reject(new Error("Not authenticated"));
  return linkWithPopup(auth.currentUser, googleProvider).then(() => undefined);
};

export const unlinkFromGoogle = (): Promise<void> => {
  if (!auth.currentUser) return Promise.reject(new Error("Not authenticated"));
  return unlink(auth.currentUser, "google.com").then(() => undefined);
};

/**
 * Delete the current Firebase Auth account.
 * If the session is too old, Firebase throws `auth/requires-recent-login`.
 * In that case the caller should re-authenticate via `reauthenticateWithGoogle`
 * and retry.
 */
export const deleteFirebaseAccount = (): Promise<void> => {
  if (!auth.currentUser) return Promise.reject(new Error("Not authenticated"));
  return auth.currentUser.delete();
};

export const reauthenticateWithGoogle = (): Promise<void> => {
  if (!auth.currentUser) return Promise.reject(new Error("Not authenticated"));
  return reauthenticateWithPopup(auth.currentUser, googleProvider).then(
    () => undefined
  );
};
