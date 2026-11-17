import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import {
  ACTIVITY_TYPE_CONFIG,
  EXPENSE_CATEGORY_CONFIG,
} from "@/constants/trip";
import { sortTimelineActivities } from "@/utils/itineraryTimeline";
import { formatCurrency, formatDate, timestampToDateStr } from "@/utils/format";

import type { ExpenseSummary } from "@/services/expenseService";
import type {
  ActivityWithId,
  DebtSettlement,
  ExpenseWithId,
  MemberBalance,
} from "@/types/firestore";

export interface PdfTripMeta {
  title: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  memberNames: string[];
  memberCount: number;
}

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1f1d2b; font-size: 11px; padding: 24px; }
  h1 { color: #eb5757; font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 18px 0 6px; padding: 6px 10px; border-radius: 6px; }
  .meta { color: #555; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { text-align: left; background: #f3f4f6; padding: 6px; font-size: 10px; }
  td { padding: 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  .r { text-align: right; }
  .day { background: #fff8e6; color: #805500; }
  .sec { background: #fff1f1; color: #b63f3f; }
  .stats { display: flex; gap: 10px; margin-top: 10px; }
  .stat { flex: 1; border: 1px solid #ffc5c5; background: #fff1f1; border-radius: 8px; padding: 8px; text-align: center; }
  .stat b { display: block; font-size: 14px; margin-top: 2px; }
  .pos { color: #1b9367; } .neg { color: #b63f3f; }
  .period { color: #888; font-size: 10px; margin: 8px 0 0; font-weight: bold; }
  .footer { margin-top: 24px; color: #888; font-size: 9px; text-align: center; }
`;

const wrap = (body: string): string =>
  `<html><head><meta charset="utf-8"/><style>${CSS}</style></head><body>${body}</body></html>`;

const header = (title: string, meta: PdfTripMeta): string => `
  <h1>${esc(title)}</h1>
  <div class="meta"><b>${esc(meta.title)}</b></div>
  ${meta.destination ? `<div class="meta">Điểm đến: ${esc(meta.destination)}</div>` : ""}
  ${meta.startDate ? `<div class="meta">Ngày đi: ${esc(meta.startDate)} → ${esc(meta.endDate ?? "")}</div>` : ""}
`;

const footer = (): string =>
  `<div class="footer">Xuất lúc ${esc(new Date().toLocaleString("vi-VN"))} • TripKeo</div>`;

export const buildItineraryHtml = (
  meta: PdfTripMeta,
  days: { dayNumber: number; date: string }[],
  activities: ActivityWithId[]
): string => {
  const total = activities.length;
  const body = days
    .map((day) => {
      const list = sortTimelineActivities(
        activities.filter((a) => a.date === day.date)
      );
      const rows = list
        .map((a) => {
          const cfg =
            ACTIVITY_TYPE_CONFIG[a.category] ?? ACTIVITY_TYPE_CONFIG.other;
          return `<tr>
            <td>${esc(a.startTime ?? "—")}${a.endTime ? ` – ${esc(a.endTime)}` : ""}</td>
            <td><b>${esc(a.title)}</b>${a.note ? `<div class="meta">${esc(a.note)}</div>` : ""}</td>
            <td>${esc(cfg.label)}</td>
            <td>${esc(a.location ?? "")}</td>
            <td class="r">${a.cost ? esc(formatCurrency(a.cost)) : ""}</td>
          </tr>`;
        })
        .join("");
      return `<h2 class="day">Ngày ${day.dayNumber} – ${esc(formatDate(day.date))} (${list.length} hoạt động)</h2>
        ${
          list.length === 0
            ? `<div class="meta">Chưa có hoạt động</div>`
            : `<table><tr><th>Giờ</th><th>Hoạt động</th><th>Loại</th><th>Địa điểm</th><th class="r">Chi phí</th></tr>${rows}</table>`
        }`;
    })
    .join("");

  return wrap(`
    ${header("Lịch trình chuyến đi", meta)}
    <div class="meta">Tổng hoạt động: ${total}</div>
    ${body}
    ${meta.memberNames.length ? `<div class="meta" style="margin-top:16px">Thành viên: ${esc(meta.memberNames.join(", "))}</div>` : ""}
    ${footer()}
  `);
};

export const buildExpensesHtml = (
  meta: PdfTripMeta,
  expenses: ExpenseWithId[],
  summary: ExpenseSummary,
  balances: MemberBalance[],
  debts: DebtSettlement[]
): string => {
  const rows = expenses
    .map((e) => {
      const cfg =
        EXPENSE_CATEGORY_CONFIG[e.category] ?? EXPENSE_CATEGORY_CONFIG.other;
      return `<tr>
        <td>${esc(timestampToDateStr(e.date))}</td>
        <td>${esc(e.description)}</td>
        <td>${esc(cfg.label)}</td>
        <td class="r">${esc(formatCurrency(e.amount))}</td>
        <td>${esc(e.paidBy || "?")}</td>
        <td>${esc(e.note ?? "")}</td>
      </tr>`;
    })
    .join("");

  const balRows = balances
    .map((b) => {
      const net = Math.round(b.net);
      return `<tr>
        <td>${esc(b.name)}</td>
        <td class="r">${esc(formatCurrency(b.totalPaid))}</td>
        <td class="r">${esc(formatCurrency(b.totalOwed))}</td>
        <td class="r ${net > 0 ? "pos" : net < 0 ? "neg" : ""}">${
          net > 0 ? "+" : net < 0 ? "−" : ""
        }${esc(formatCurrency(Math.abs(net)))}</td>
      </tr>`;
    })
    .join("");

  const debtRows = debts
    .map(
      (d) =>
        `<tr><td>${esc(d.fromName)}</td><td>${esc(d.toName)}</td><td class="r">${esc(formatCurrency(d.amount))}</td></tr>`
    )
    .join("");

  return wrap(`
    ${header("Báo cáo chi tiêu", meta)}
    <div class="meta">${meta.memberCount} thành viên</div>
    <div class="stats">
      <div class="stat">Tổng chi tiêu<b>${esc(formatCurrency(summary.totalSpent))}</b></div>
      <div class="stat">Số khoản<b>${summary.expenseCount}</b></div>
      <div class="stat">Trung bình / người<b>${
        meta.memberCount > 0
          ? esc(
              formatCurrency(Math.round(summary.totalSpent / meta.memberCount))
            )
          : "—"
      }</b></div>
    </div>
    <h2 class="sec">Danh sách chi tiêu</h2>
    <table><tr><th>Ngày</th><th>Mô tả</th><th>Loại</th><th class="r">Số tiền</th><th>Người trả</th><th>Ghi chú</th></tr>${rows}</table>
    ${
      balances.length
        ? `<h2 class="sec">Số dư từng người</h2>
           <table><tr><th>Thành viên</th><th class="r">Đã trả</th><th class="r">Phần chịu</th><th class="r">Số dư</th></tr>${balRows}</table>`
        : ""
    }
    ${
      debts.length
        ? `<h2 class="sec">Ai trả ai?</h2>
           <table><tr><th>Người trả</th><th>Người nhận</th><th class="r">Số tiền</th></tr>${debtRows}</table>`
        : ""
    }
    ${footer()}
  `);
};

/** Tạo file PDF từ HTML rồi mở menu chia sẻ / lưu của hệ điều hành. */
export const exportPdf = async (
  html: string,
  dialogTitle: string
): Promise<void> => {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle,
    });
  } else {
    throw new Error("Sharing is not available on this device");
  }
};
