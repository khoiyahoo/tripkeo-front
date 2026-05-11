import {
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = (): Promise<void> =>
  signInWithPopup(auth, googleProvider).then(() => undefined);

export const signOut = (): Promise<void> => firebaseSignOut(auth);
