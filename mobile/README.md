# Tripkeo Mobile (Expo + React Native)

Dùng chung Firebase project với web (`../`) để đồng bộ dữ liệu.

## Chạy thử
```bash
cp .env.example .env.local   # điền cùng giá trị Firebase với web (VITE_* -> EXPO_PUBLIC_*)
npm install
npx expo start               # iOS: quét QR bằng Expo Go; Android: bấm "a" hoặc build APK
```

## Build APK (Android)
```bash
npx eas-cli build -p android --profile preview   # hoặc thêm --local để build trên máy
```

## Cấu trúc
- `app/` — màn hình (Expo Router): `(auth)` đăng nhập, `(tabs)` các tab chính
- `src/lib` — firebase, queryClient · `src/stores` — Zustand · `src/hooks`, `src/services`, `src/types` — logic port từ web

## Lưu ý Expo Go
Không dùng được `@react-native-firebase` và Google Sign-In native trong Expo Go; project dùng Firebase JS SDK + `expo-auth-session`.
