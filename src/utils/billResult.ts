// Chuẩn hóa dữ liệu bill do AI trả về (không tin mù quáng) và dựng ghi chú. Hàm thuần.
import { guessCategory } from "./vietQr.ts";

export interface BillItem {
  name: string;
  qty: number;
  amount: number;
}

export interface BillResult {
  merchant?: string;
  /** YYYY-MM-DD */
  date?: string;
  total?: number;
  items: BillItem[];
  category:
    | "food"
    | "transport"
    | "stay"
    | "ticket"
    | "shopping"
    | "entertainment"
    | "other";
}

const MAX_ITEMS = 60;
const MAX_MONEY = 10_000_000_000;

const toMoney = (v: unknown): number | undefined => {
  let n: number;
  if (typeof v === "number") n = v;
  else if (typeof v === "string")
    n = Number(v.replace(/[.,\s]/g, "").replace(/(đ|d|vnd|₫)$/i, ""));
  else return undefined;
  if (!Number.isFinite(n)) return undefined;
  n = Math.round(n);
  return n > 0 && n <= MAX_MONEY ? n : undefined;
};

const toText = (v: unknown, max = 80): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

const sentenceCase = (s: string): string => {
  const letters = s.replace(/[^\p{L}]/gu, "");
  if (letters && letters === letters.toLocaleUpperCase("vi")) {
    const lower = s.toLocaleLowerCase("vi");
    return lower.charAt(0).toLocaleUpperCase("vi") + lower.slice(1);
  }
  return s;
};

const toDate = (v: unknown): string | undefined => {
  const m =
    typeof v === "string" ? v.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  const valid =
    y >= 2000 &&
    y <= 2100 &&
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d;
  return valid ? m[0] : undefined;
};

export const normalizeBillResult = (raw: unknown): BillResult => {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const merchantText = toText(r.merchant);
  const items: BillItem[] = [];
  if (Array.isArray(r.items)) {
    for (const it of r.items.slice(0, MAX_ITEMS)) {
      const o = (it && typeof it === "object" ? it : {}) as Record<
        string,
        unknown
      >;
      const name = sentenceCase(toText(o.name, 60));
      const amount = toMoney(o.amount);
      if (!name || !amount) continue;
      const q = typeof o.quantity === "number" ? Math.round(o.quantity) : 1;
      items.push({ name, amount, qty: q >= 1 && q <= 99 ? q : 1 });
    }
  }
  return {
    merchant: merchantText ? sentenceCase(merchantText) : undefined,
    date: toDate(r.date),
    total: toMoney(r.total),
    items,
    category: guessCategory(
      `${merchantText} ${items.map((i) => i.name).join(" ")}`
    ),
  };
};

/** 45000 → "45k"; 45500 → "45.500đ" */
export const formatItemAmount = (n: number): string =>
  n % 1000 === 0
    ? `${n / 1000}k`
    : `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;

/** Ghi chú: mỗi món một dòng, ví dụ "Nước chanh - 45k". */
export const billItemsToNote = (items: BillItem[]): string =>
  items
    .map(
      (i) =>
        `${i.name}${i.qty > 1 ? ` x${i.qty}` : ""} - ${formatItemAmount(i.amount)}`
    )
    .join("\n");

export const sumItems = (items: BillItem[]): number =>
  items.reduce((s, i) => s + i.amount, 0);
