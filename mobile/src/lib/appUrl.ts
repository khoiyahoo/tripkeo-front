/** URL gốc của web (Vercel) — dùng cho link mời và gọi API gửi email. */
export const getAppUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_APP_URL;
  if (!url) throw new Error("Missing EXPO_PUBLIC_APP_URL");
  return url.replace(/\/$/, "");
};
