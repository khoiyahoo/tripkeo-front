import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

// Cùng project Firebase với web để đồng bộ dữ liệu (Auth + Firestore).
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// initializeAuth chỉ được gọi một lần (Fast Refresh sẽ chạy lại module).
// Trên web (expo start --web) bản firebase/auth không có getReactNativePersistence
// nên dùng getAuth mặc định; native thì lưu phiên bằng AsyncStorage.
export const auth =
  isFirstInit && Platform.OS !== "web"
    ? initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      })
    : getAuth(app);

// Firestore JS SDK trên React Native thường treo khi dùng WebChannel streaming
// (ghi không bao giờ được xác nhận), nên ép dùng long polling. initializeFirestore
// chỉ được gọi một lần; Fast Refresh chạy lại module thì dùng getFirestore.
export const db = isFirstInit
  ? initializeFirestore(app, { experimentalForceLongPolling: true })
  : getFirestore(app);
