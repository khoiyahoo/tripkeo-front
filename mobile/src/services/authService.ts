import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  signInWithCredential,
  unlink,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

WebBrowser.maybeCompleteAuthSession();

/**
 * Đăng nhập Google qua trang web `/mobile-auth` (chạy được trong Expo Go).
 * Trang web đăng nhập Google rồi redirect về app kèm `idToken`, sau đó
 * đăng nhập Firebase trên app bằng credential đó.
 * Trả về false nếu người dùng đóng trình duyệt.
 */
const getGoogleCredential = async () => {
  const appUrl = process.env.EXPO_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing EXPO_PUBLIC_APP_URL");

  const redirectUri = Linking.createURL("auth");
  const authUrl = `${appUrl.replace(/\/$/, "")}/mobile-auth?redirect=${encodeURIComponent(redirectUri)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type !== "success") return null;

  const idToken = Linking.parse(result.url).queryParams?.idToken;
  if (typeof idToken !== "string") throw new Error("No ID token returned");

  return GoogleAuthProvider.credential(idToken);
};

export const signInWithGoogle = async (): Promise<boolean> => {
  const credential = await getGoogleCredential();
  if (!credential) return false;
  await signInWithCredential(auth, credential);
  return true;
};

/** Liên kết Google vào tài khoản hiện tại. Trả về false nếu người dùng đóng trình duyệt. */
export const linkWithGoogle = async (): Promise<boolean> => {
  if (!auth.currentUser) throw new Error("Not authenticated");
  const credential = await getGoogleCredential();
  if (!credential) return false;
  await linkWithCredential(auth.currentUser, credential);
  return true;
};

export const unlinkFromGoogle = async (): Promise<void> => {
  if (!auth.currentUser) throw new Error("Not authenticated");
  await unlink(auth.currentUser, "google.com");
};

/** Đăng nhập lại (cần trước khi xóa tài khoản nếu phiên đã cũ). */
export const reauthenticateWithGoogle = async (): Promise<boolean> => {
  if (!auth.currentUser) throw new Error("Not authenticated");
  const credential = await getGoogleCredential();
  if (!credential) return false;
  await reauthenticateWithCredential(auth.currentUser, credential);
  return true;
};

/**
 * Xóa tài khoản Firebase Auth. Nếu phiên quá cũ Firebase ném
 * `auth/requires-recent-login` — caller cần reauthenticateWithGoogle rồi thử lại.
 */
export const deleteFirebaseAccount = async (): Promise<void> => {
  if (!auth.currentUser) throw new Error("Not authenticated");
  await auth.currentUser.delete();
};

export const signOut = (): Promise<void> => firebaseSignOut(auth);
