// Ảnh bìa ngẫu nhiên từ Picsum, giống web.
export const generateCoverSeed = (): string =>
  Math.random().toString(36).slice(2, 10);

export const picsumCoverUrl = (seed: string): string =>
  `https://picsum.photos/seed/${seed}/1200/600`;

/** Ngày hôm nay (múi giờ máy) dạng YYYY-MM-DD. */
export const getTodayDateStr = (): string => {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - tzOffsetMs).toISOString().split("T")[0];
};

export const addDays = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
