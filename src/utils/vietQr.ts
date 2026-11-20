// Đọc mã QR thanh toán VietQR / NAPAS 247 (chuẩn EMVCo) và tạo liên kết mở app ngân hàng.
// Hàm thuần, không phụ thuộc UI (test được bằng `node --test`).

export interface ParsedPaymentQr {
  /** Số tiền (VND). undefined nếu QR tĩnh không kèm số tiền. */
  amount?: number;
  merchantName?: string;
  city?: string;
  /** Nội dung chuyển khoản / mô tả đơn hàng */
  memo?: string;
  billNumber?: string;
  bankBin?: string;
  bankName?: string;
  accountNumber?: string;
  /** Mã QR động (một lần) thay vì tĩnh */
  isDynamic: boolean;
}

export type ParseResult =
  | { ok: true; data: ParsedPaymentQr }
  | { ok: false; reason: "not_emv" | "bad_crc" | "no_account" };

/** BIN ngân hàng → { tên, mã VietQR dùng trong liên kết `ba=<stk>@<mã>` } */
const BANKS: Record<string, { name: string; code: string }> = {
  "970436": { name: "Vietcombank", code: "vcb" },
  "970415": { name: "VietinBank", code: "icb" },
  "970418": { name: "BIDV", code: "bidv" },
  "970405": { name: "Agribank", code: "vba" },
  "970407": { name: "Techcombank", code: "tcb" },
  "970422": { name: "MB Bank", code: "mb" },
  "970416": { name: "ACB", code: "acb" },
  "970432": { name: "VPBank", code: "vpb" },
  "970423": { name: "TPBank", code: "tpb" },
  "970403": { name: "Sacombank", code: "stb" },
  "970437": { name: "HDBank", code: "hdb" },
  "970441": { name: "VIB", code: "vib" },
  "970443": { name: "SHB", code: "shb" },
  "970448": { name: "OCB", code: "ocb" },
  "970426": { name: "MSB", code: "msb" },
  "970431": { name: "Eximbank", code: "eib" },
  "970429": { name: "SCB", code: "scb" },
  "970449": { name: "LPBank", code: "lpb" },
  "970440": { name: "SeABank", code: "seab" },
  "546034": { name: "CAKE", code: "cake" },
};

/** App ngân hàng phổ biến (appId theo danh sách deeplink của VietQR). */
export const BANK_APPS: { appId: string; name: string }[] = [
  { appId: "mb", name: "MB Bank" },
  { appId: "vcb", name: "VCB Digibank" },
  { appId: "tcb", name: "Techcombank" },
  { appId: "icb", name: "VietinBank iPay" },
  { appId: "bidv", name: "BIDV SmartBanking" },
  { appId: "vba", name: "Agribank Plus" },
  { appId: "vpb", name: "VPBank NEO" },
  { appId: "tpb", name: "TPBank" },
  { appId: "acb", name: "ACB ONE" },
  { appId: "lpb", name: "LPBank" },
  { appId: "cake", name: "CAKE" },
  { appId: "ocb", name: "OCB OMNI" },
  { appId: "timo", name: "Timo" },
  { appId: "hdb", name: "HDBank" },
  { appId: "shb", name: "SHB SAHA" },
  { appId: "scb", name: "SCB" },
  { appId: "seab", name: "SeAMobile" },
];

/** Đọc chuỗi TLV của EMV: [tag 2][độ dài 2][giá trị]. Trả null nếu sai cấu trúc. */
export const parseTlv = (input: string): Record<string, string> | null => {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < input.length) {
    if (i + 4 > input.length) return null;
    const tag = input.slice(i, i + 2);
    const len = Number(input.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !Number.isInteger(len)) return null;
    if (i + 4 + len > input.length) return null;
    out[tag] = input.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
};

/** CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF) như chuẩn EMVCo. */
export const crc16 = (text: string): string => {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= (text.charCodeAt(i) & 0xff) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
};

const hasValidCrc = (raw: string): boolean => {
  if (raw.length < 8) return false;
  const body = raw.slice(0, -4);
  if (!body.endsWith("6304")) return false;
  return crc16(body) === raw.slice(-4).toUpperCase();
};

export const getBankName = (bin?: string): string | undefined =>
  bin ? BANKS[bin]?.name : undefined;

export const getBankCode = (bin?: string): string | undefined =>
  bin ? BANKS[bin]?.code : undefined;

/** Phân tích nội dung QR quét được. */
export const parsePaymentQr = (rawInput: string): ParseResult => {
  const raw = rawInput.trim();
  if (!/^000201/.test(raw)) return { ok: false, reason: "not_emv" };
  if (!hasValidCrc(raw)) return { ok: false, reason: "bad_crc" };

  const root = parseTlv(raw);
  if (!root) return { ok: false, reason: "not_emv" };

  // Tag 38 = VietQR (NAPAS); tag 26-51 là các tài khoản thương nhân khác
  const acctTag =
    root["38"] ??
    Object.entries(root).find(([t]) => Number(t) >= 26 && Number(t) <= 51)?.[1];
  const acct = acctTag ? parseTlv(acctTag) : null;
  const bankInfo = acct?.["01"] ? parseTlv(acct["01"]) : null;
  const bankBin = bankInfo?.["00"];
  const accountNumber = bankInfo?.["01"];
  if (!bankBin || !accountNumber) return { ok: false, reason: "no_account" };

  const amountNum = root["54"] ? Number(root["54"]) : Number.NaN;
  const extra = root["62"] ? parseTlv(root["62"]) : null;

  return {
    ok: true,
    data: {
      amount:
        Number.isFinite(amountNum) && amountNum > 0
          ? Math.round(amountNum)
          : undefined,
      merchantName: root["59"] || undefined,
      city: root["60"] || undefined,
      memo: extra?.["08"] || undefined,
      billNumber: extra?.["01"] || undefined,
      bankBin,
      bankName: getBankName(bankBin),
      accountNumber,
      isDynamic: root["01"] === "12",
    },
  };
};

const removeDiacritics = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

/** Nội dung chuyển khoản: không dấu, chỉ chữ/số/khoảng trắng, tối đa 50 ký tự. */
export const sanitizeMemo = (memo: string): string =>
  removeDiacritics(memo)
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50)
    .trim();

/**
 * Liên kết mở app ngân hàng với thông tin chuyển khoản điền sẵn
 * (dịch vụ deeplink của VietQR). Trả null nếu thiếu thông tin cần thiết.
 */
export const buildPayUrl = (opts: {
  appId: string;
  bankBin?: string;
  accountNumber?: string;
  amount: number;
  memo: string;
  accountName?: string;
  returnUrl: string;
}): string | null => {
  const code = getBankCode(opts.bankBin);
  if (!code || !opts.accountNumber || !(opts.amount > 0)) return null;
  const params = [
    `app=${encodeURIComponent(opts.appId)}`,
    `ba=${encodeURIComponent(opts.accountNumber)}@${code}`,
    `am=${Math.round(opts.amount)}`,
    `tn=${encodeURIComponent(sanitizeMemo(opts.memo) || "Thanh toan")}`,
  ];
  if (opts.accountName) {
    params.push(`bn=${encodeURIComponent(sanitizeMemo(opts.accountName))}`);
  }
  params.push(`url=${encodeURIComponent(opts.returnUrl)}`);
  return `https://dl.vietqr.io/pay?${params.join("&")}`;
};

type CategoryGuess =
  | "food"
  | "transport"
  | "stay"
  | "ticket"
  | "shopping"
  | "entertainment"
  | "other";

/** Gợi ý nhóm chi tiêu từ tên quán / nội dung (người dùng vẫn đổi được). */
export const guessCategory = (text: string): CategoryGuess => {
  const t = ` ${removeDiacritics(text).toLowerCase()} `;
  if (
    /(cafe|coffee|ca phe| tra |tea|quan |nha hang|pho |bun |com |bbq| lau |an uong|food|kfc|pizza|bakery|banh|nuoc)/.test(
      t
    )
  )
    return "food";
  if (/(grab|xanh sm|taxi| xe |bus|ve tau|ve xe|xang|parking|gui xe)/.test(t))
    return "transport";
  if (/(hotel|resort|homestay|hostel|khach san|villa|motel)/.test(t))
    return "stay";
  if (
    /(ve vao|ve tham quan|ticket|bao tang|museum|vinwonders|sun world)/.test(t)
  )
    return "ticket";
  if (/(shop|mart|store|cua hang|sieu thi|boutique)/.test(t)) return "shopping";
  if (/(karaoke|pub|cinema|rap phim|game|spa|massage)/.test(t))
    return "entertainment";
  return "other";
};
