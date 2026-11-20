// Phân tích văn bản đọc được từ ảnh bill (hàm thuần, test được bằng `node --test`).
import { guessCategory } from "./vietQr.ts";

export interface BillItem {
  name: string;
  amount: number;
  qty: number;
}

export interface ParsedBill {
  /** Tổng tiền dự đoán tốt nhất (VND) */
  total?: number;
  /** Tối đa 3 số tiền gợi ý để người dùng chọn nhanh (số đầu = total) */
  totalCandidates: number[];
  /** Ngày trên bill, dạng YYYY-MM-DD */
  date?: string;
  merchant?: string;
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

const noAccent = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

/** Dòng thuộc nhóm "không phải món hàng": tiêu đề, tổng, thuế, thanh toán, thông tin cửa hàng... */
const NON_ITEM =
  /(tong|thanh tien|tam tinh|cong tien|vat|thue|giam gia|chiet khau|discount|subtotal|total|khach dua|tien thoi|tien thua|change|cash|tien mat|the |visa|master|sdt|dt:|tel|hotline|dia chi|d\/c|dc:|mst|ma so thue|tax|hoa don|phieu|receipt|bill|invoice|so luong|don gia|ten mon|stt|ban so|ban:|thu ngan|nhan vien|ngay|date|gio |time|wifi|password|cam on|thank|diem|so du|voucher|phi dich vu|service)/;

const TOTAL_PRIORITY: { re: RegExp; score: number }[] = [
  {
    re: /(tong thanh toan|tong tien thanh toan|can thanh toan|phai tra|phai thanh toan|amount due|grand total)/,
    score: 5,
  },
  { re: /(tong cong|tong tien|tong so tien|total)/, score: 4 },
  { re: /(thanh tien|tong\b)/, score: 2 },
];

const TOTAL_EXCLUDE =
  /(khach dua|tien thoi|tien thua|change|cash|tien mat|giam gia|chiet khau|discount|diem|so du|tam tinh|subtotal|vat|thue|tax|phi |service)/;

/** Mọi số tiền trên một dòng (VND). Bỏ qua số quá dài (sđt, mã vạch) và số nhỏ hơn 1.000. */
export const extractAmounts = (line: string): number[] => {
  const out: number[] = [];
  const re =
    /(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(k|nghin|ngàn|đ|d|vnd|vnđ|₫)?(?![\d])/gi;
  for (const m of line.matchAll(re)) {
    const digits = m[1].replace(/[.,]/g, "");
    if (digits.length > 9) continue;
    let value = Number(digits);
    const suffix = (m[2] ?? "").toLowerCase();
    if (suffix === "k" || suffix === "nghin" || suffix === "ngàn")
      value *= 1000;
    if (Number.isFinite(value) && value >= 1000) out.push(value);
  }
  return out;
};

/** 45000 → "45k"; 45500 → "45.500đ" */
export const formatItemAmount = (n: number): string => {
  if (n % 1000 === 0) return `${n / 1000}k`;
  return `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
};

const sentenceCase = (s: string): string => {
  const letters = s.replace(/[^\p{L}]/gu, "");
  if (letters && letters === letters.toLocaleUpperCase("vi")) {
    const lower = s.toLocaleLowerCase("vi");
    return lower.charAt(0).toLocaleUpperCase("vi") + lower.slice(1);
  }
  return s;
};

const parseDate = (lines: string[]): string | undefined => {
  const found: { iso: string; near: boolean }[] = [];
  for (const line of lines) {
    const near = /(ngay|date)/.test(noAccent(line));
    for (const m of line.matchAll(
      /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g
    )) {
      const d = Number(m[1]);
      const mo = Number(m[2]);
      let y = Number(m[3]);
      if (m[3].length === 2) y += 2000;
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 2000 && y <= 2100) {
        found.push({
          iso: `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
          near,
        });
      }
    }
    for (const m of line.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (y >= 2000 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31)
        found.push({ iso: m[0], near });
    }
  }
  return (found.find((f) => f.near) ?? found[0])?.iso;
};

const parseMerchant = (lines: string[]): string | undefined => {
  const candidate = (raw: string, allowDigits: boolean): string | undefined => {
    const line = raw
      .replace(/[^\p{L}\p{N}\s&'.-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    const letters = (line.match(/\p{L}/gu) ?? []).length;
    const digits = (line.match(/\d/g) ?? []).length;
    if (letters < 3 || digits > letters * (allowDigits ? 1 : 0.3))
      return undefined;
    // Dòng có số liền nhau (số nhà, sđt) thường là địa chỉ, không phải tên quán
    if (!allowDigits && /\d{2,}/.test(line)) return undefined;
    const n = noAccent(line);
    if (
      /(hoa don|phieu|receipt|invoice|bill|dia chi|d\/c|sdt|tel|mst|ma so thue|www|http|hotline|ban so|ngay|thu ngan)/.test(
        n
      )
    )
      return undefined;
    return sentenceCase(line);
  };
  const head = lines.slice(0, 6);
  for (const allowDigits of [false, true]) {
    for (const raw of head) {
      const c = candidate(raw, allowDigits);
      if (c) return c;
    }
  }
  return undefined;
};

const parseItems = (lines: string[]): BillItem[] => {
  const items: BillItem[] = [];
  for (const line of lines) {
    const n = noAccent(line);
    if (NON_ITEM.test(n)) continue;
    const amounts = extractAmounts(line);
    if (amounts.length === 0) continue;
    // Phần tên: từ đầu dòng tới số đầu tiên (không tính "x2" / "2x")
    let namePart = line;
    let qty = 1;
    const qtyMatch =
      namePart.match(/\b[xX]\s?(\d{1,2})\b/) ??
      namePart.match(/\b(\d{1,2})\s?[xX]\b/);
    if (qtyMatch) {
      qty = Number(qtyMatch[1]);
      namePart = namePart.replace(qtyMatch[0], " ");
    }
    const firstNum = namePart.search(/\d/);
    if (firstNum >= 0) {
      const head = namePart.slice(0, firstNum);
      // Số lượng đứng riêng ngay sau tên (vd "Nước chanh 2 25.000 50.000")
      const after = namePart.slice(firstNum).match(/^(\d{1,2})\s/);
      if (after && !qtyMatch) qty = Math.max(1, Number(after[1]));
      namePart = head;
    }
    const name = sentenceCase(
      namePart
        .replace(/[^\p{L}\p{N}\s&'()-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
    );
    if ((name.match(/\p{L}/gu) ?? []).length < 2) continue;
    items.push({ name, amount: amounts[amounts.length - 1], qty });
  }
  return items;
};

const parseTotal = (
  lines: string[]
): { total?: number; candidates: number[] } => {
  const scored: { score: number; amount: number }[] = [];
  const excludedAmounts = new Set<number>();
  lines.forEach((line, i) => {
    const n = noAccent(line);
    const excluded = TOTAL_EXCLUDE.test(n);
    let amounts = extractAmounts(line);
    // OCR hay tách số tiền xuống dòng kế tiếp
    if (
      amounts.length === 0 &&
      i + 1 < lines.length &&
      TOTAL_PRIORITY.some((p) => p.re.test(n))
    ) {
      amounts = extractAmounts(lines[i + 1]).slice(0, 1);
    }
    if (excluded) {
      for (const a of amounts) excludedAmounts.add(a);
      return;
    }
    const prio = TOTAL_PRIORITY.find((p) => p.re.test(n));
    if (prio && amounts.length > 0) {
      scored.push({ score: prio.score, amount: amounts[amounts.length - 1] });
    }
  });

  const candidates: number[] = [];
  const push = (v: number) => {
    if (!candidates.includes(v) && candidates.length < 3) candidates.push(v);
  };
  scored.sort((a, b) => b.score - a.score || b.amount - a.amount);
  for (const s of scored) push(s.amount);

  // Bổ sung bằng các số lớn nhất không nằm trên dòng tiền khách đưa, giảm giá...
  const all = lines.flatMap((l) =>
    TOTAL_EXCLUDE.test(noAccent(l)) ? [] : extractAmounts(l)
  );
  const rest = [...new Set(all)]
    .filter((v) => !excludedAmounts.has(v))
    .sort((a, b) => b - a);
  for (const v of rest) push(v);

  return { total: candidates[0], candidates };
};

export const parseBill = (text: string): ParsedBill => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const { total, candidates } = parseTotal(lines);
  const merchant = parseMerchant(lines);
  const items = parseItems(lines);
  return {
    total,
    totalCandidates: candidates,
    date: parseDate(lines),
    merchant,
    items,
    category: guessCategory(
      `${merchant ?? ""} ${items.map((i) => i.name).join(" ")}`
    ),
  };
};

/** Ghi chú: mỗi món một dòng, ví dụ "Nước chanh - 45k". */
export const billItemsToNote = (items: BillItem[]): string =>
  items
    .map(
      (i) =>
        `${i.name}${i.qty > 1 ? ` x${i.qty}` : ""} - ${formatItemAmount(i.amount)}`
    )
    .join("\n");
