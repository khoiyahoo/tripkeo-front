/**
 * @react-pdf/renderer document for expense export.
 * Follows the same pattern as itineraryPdf.tsx.
 */
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { EXPENSE_CATEGORY_CONFIG } from "@/constants/trip";
import type { SettlementResult } from "@/services/expenseService";

import type { ExpenseWithId } from "@/types/firestore";

// ─── Font Registration ────────────────────────────────────────
Font.register({
  family: "NotoSans",
  fonts: [
    { src: "/fonts/NotoSans-Regular.ttf" },
    { src: "/fonts/NotoSans-Bold.ttf", fontWeight: 700 },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

// ─── Types ────────────────────────────────────────────────────
export interface ExpensePdfMeta {
  title: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  memberCount: number;
}

export interface ExpensePdfProps {
  meta: ExpensePdfMeta;
  expenses: ExpenseWithId[];
  budget: number;
  /** Only fund-affecting expenses (Cases 1+2+3). Excludes Case 4. */
  totalGroupSpent: number;
  settlement: SettlementResult;
}

// ─── Helpers ─────────────────────────────────────────────────
const fmtCurrency = (amount: number): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

const fmtDate = (dateStr: string): string =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));

const timestampToStr = (ts: unknown): string => {
  if (!ts) return "";
  if (typeof ts === "object" && ts !== null && "toDate" in ts) {
    return fmtDate((ts as { toDate: () => Date }).toDate().toISOString());
  }
  if (typeof ts === "string") return fmtDate(ts);
  return "";
};

// ─── Colors ───────────────────────────────────────────────────
const C = {
  teal: "#0d9488",
  headerBg: "#0f766e",
  border: "#e2e8f0",
  text: "#1e293b",
  textMuted: "#64748b",
  white: "#ffffff",
  green: "#166534",
  greenBg: "#f0fdf4",
  red: "#991b1b",
  redBg: "#fef2f2",
  amberText: "#92400e",
  amberBg: "#fffbeb",
};

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 9,
    color: C.text,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 36,
    backgroundColor: C.white,
  },
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.teal,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: C.headerBg,
    marginBottom: 4,
  },
  headerMeta: { flexDirection: "row", gap: 16 },
  headerMetaText: { fontSize: 8.5, color: C.textMuted },
  headerMetaBold: { fontWeight: 700, color: C.text },

  // Summary cards
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 8,
    alignItems: "center" as const,
  },
  summaryLabel: { fontSize: 7.5, color: C.textMuted, marginBottom: 2 },
  summaryValue: { fontSize: 12, fontWeight: 700, color: C.text },

  // Table
  table: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  colHeader: { flexDirection: "row", backgroundColor: C.headerBg },
  colHeaderCell: {
    color: C.white,
    fontWeight: 700,
    fontSize: 8,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  rowAlt: { backgroundColor: "#f8fafc" },
  cell: { paddingVertical: 4, paddingHorizontal: 6, fontSize: 8.5 },

  // Balance / Debt section
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: C.headerBg,
    marginBottom: 6,
    marginTop: 10,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  debtRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.textMuted },
});

// Column widths (percentages)
const COL = {
  no: "5%",
  date: "12%",
  desc: "25%",
  category: "12%",
  amount: "14%",
  paidBy: "17%",
  note: "15%",
};

// ─── Document ─────────────────────────────────────────────────
export const ExpensePdfDocument = ({
  meta,
  expenses,
  budget,
  totalGroupSpent,
  settlement,
}: ExpensePdfProps) => {
  const remaining = settlement.fundRemaining;
  const perPerson = meta.memberCount > 0 ? budget / meta.memberCount : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{meta.title} – Chi phí</Text>
          <View style={styles.headerMeta}>
            {meta.destination && (
              <Text style={styles.headerMetaText}>
                📍 <Text style={styles.headerMetaBold}>{meta.destination}</Text>
              </Text>
            )}
            {meta.startDate && meta.endDate && (
              <Text style={styles.headerMetaText}>
                📅 {meta.startDate} → {meta.endDate}
              </Text>
            )}
            <Text style={styles.headerMetaText}>
              👥 {meta.memberCount} thành viên
            </Text>
          </View>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Ngân sách</Text>
            <Text style={styles.summaryValue}>{fmtCurrency(budget)}</Text>
            {perPerson > 0 && (
              <Text style={[styles.summaryLabel, { marginTop: 2 }]}>
                {fmtCurrency(perPerson)} / người
              </Text>
            )}
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Đã chi (quỹ)</Text>
            <Text style={styles.summaryValue}>
              {fmtCurrency(totalGroupSpent)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Còn lại</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: remaining < 0 ? C.red : C.green },
              ]}
            >
              {fmtCurrency(remaining)}
            </Text>
          </View>
        </View>

        {/* Expense table */}
        <View style={styles.table}>
          <View style={styles.colHeader}>
            <Text style={[styles.colHeaderCell, { width: COL.no }]}>#</Text>
            <Text style={[styles.colHeaderCell, { width: COL.date }]}>
              Ngày
            </Text>
            <Text style={[styles.colHeaderCell, { width: COL.desc }]}>
              Mô tả
            </Text>
            <Text style={[styles.colHeaderCell, { width: COL.category }]}>
              Loại
            </Text>
            <Text
              style={[
                styles.colHeaderCell,
                { width: COL.amount, textAlign: "right" },
              ]}
            >
              Số tiền
            </Text>
            <Text style={[styles.colHeaderCell, { width: COL.paidBy }]}>
              Người trả
            </Text>
            <Text style={[styles.colHeaderCell, { width: COL.note }]}>
              Ghi chú
            </Text>
          </View>

          {expenses.map((exp, idx) => {
            const paidByLabel =
              typeof exp.paidBy === "string"
                ? exp.paidBy
                : exp.paidBy.type === "group_fund"
                  ? "Quỹ chung"
                  : exp.paidBy.displayName;
            const catLabel =
              EXPENSE_CATEGORY_CONFIG[exp.category]?.label ?? exp.category;

            return (
              <View
                key={exp.id}
                style={[styles.row, ...(idx % 2 === 1 ? [styles.rowAlt] : [])]}
              >
                <Text style={[styles.cell, { width: COL.no }]}>{idx + 1}</Text>
                <Text style={[styles.cell, { width: COL.date }]}>
                  {timestampToStr(exp.date)}
                </Text>
                <Text style={[styles.cell, { width: COL.desc }]}>
                  {exp.description}
                </Text>
                <Text style={[styles.cell, { width: COL.category }]}>
                  {catLabel}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    { width: COL.amount, textAlign: "right" },
                  ]}
                >
                  {fmtCurrency(exp.amount)}
                </Text>
                <Text style={[styles.cell, { width: COL.paidBy }]}>
                  {paidByLabel}
                </Text>
                <Text style={[styles.cell, { width: COL.note }]}>
                  {exp.note ?? ""}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Settlement section */}
        <View wrap={false}>
          <Text style={styles.sectionTitle}>📋 Quyết toán quỹ</Text>

          {/* Fund balance breakdown */}
          <View style={[styles.table, { marginBottom: 8 }]}>
            <View style={[styles.balanceRow, { backgroundColor: "#f8fafc" }]}>
              <Text style={{ fontSize: 8.5 }}>Ngân sách</Text>
              <Text style={{ fontSize: 8.5, fontWeight: 700 }}>
                {fmtCurrency(budget)}
              </Text>
            </View>
            <View style={styles.balanceRow}>
              <Text style={{ fontSize: 8.5 }}>Chi quỹ chung</Text>
              <Text style={{ fontSize: 8.5 }}>
                − {fmtCurrency(settlement.groupFundSpent)}
              </Text>
            </View>
            {settlement.totalReimburseToMembers > 0 && (
              <View style={styles.balanceRow}>
                <Text style={{ fontSize: 8.5 }}>Hoàn cho member trả hộ</Text>
                <Text style={{ fontSize: 8.5 }}>
                  − {fmtCurrency(settlement.totalReimburseToMembers)}
                </Text>
              </View>
            )}
            {settlement.totalRefundNonParticipants > 0 && (
              <View style={styles.balanceRow}>
                <Text style={{ fontSize: 8.5 }}>
                  Hoàn cho member không tham gia
                </Text>
                <Text style={{ fontSize: 8.5 }}>
                  −{" "}
                  {fmtCurrency(
                    Math.round(settlement.totalRefundNonParticipants)
                  )}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.balanceRow,
                { backgroundColor: remaining < 0 ? C.redBg : C.greenBg },
              ]}
            >
              <Text style={{ fontSize: 8.5, fontWeight: 700 }}>
                Quỹ còn lại
              </Text>
              <Text
                style={{
                  fontSize: 8.5,
                  fontWeight: 700,
                  color: remaining < 0 ? C.red : C.green,
                }}
              >
                {fmtCurrency(Math.round(remaining))}
              </Text>
            </View>
            {settlement.perPersonReturn > 0 && (
              <View style={styles.balanceRow}>
                <Text style={{ fontSize: 8.5, color: C.textMuted }}>
                  Hoàn mỗi người ({meta.memberCount} người)
                </Text>
                <Text style={{ fontSize: 8.5, color: C.green }}>
                  {fmtCurrency(Math.round(settlement.perPersonReturn))}
                </Text>
              </View>
            )}
            {settlement.perPersonOwes > 0 && (
              <View style={styles.balanceRow}>
                <Text style={{ fontSize: 8.5, color: C.textMuted }}>
                  Mỗi người đóng thêm ({meta.memberCount} người)
                </Text>
                <Text style={{ fontSize: 8.5, color: C.red }}>
                  {fmtCurrency(Math.round(settlement.perPersonOwes))}
                </Text>
              </View>
            )}
          </View>

          {/* Who receives money */}
          {(settlement.reimburseToMembers.length > 0 ||
            settlement.refundToNonParticipants.length > 0 ||
            settlement.perPersonReturn > 0) && (
            <>
              <Text
                style={[styles.sectionTitle, { fontSize: 9, marginTop: 6 }]}
              >
                📌 Ai nhận tiền từ quỹ
              </Text>
              <View style={styles.table}>
                <View style={styles.colHeader}>
                  <Text style={[styles.colHeaderCell, { flex: 2 }]}>
                    Người nhận
                  </Text>
                  <Text style={[styles.colHeaderCell, { flex: 2 }]}>Lý do</Text>
                  <Text
                    style={[
                      styles.colHeaderCell,
                      { flex: 1, textAlign: "right" },
                    ]}
                  >
                    Số tiền
                  </Text>
                </View>
                {settlement.reimburseToMembers.map((r) => (
                  <View key={`r-${r.uid}`} style={styles.balanceRow}>
                    <Text style={{ fontSize: 8.5, flex: 2, color: C.green }}>
                      {r.name}
                    </Text>
                    <Text
                      style={{ fontSize: 8.5, flex: 2, color: C.textMuted }}
                    >
                      Trả hộ
                    </Text>
                    <Text
                      style={{ fontSize: 8.5, flex: 1, textAlign: "right" }}
                    >
                      {fmtCurrency(Math.round(r.amount))}
                    </Text>
                  </View>
                ))}
                {settlement.refundToNonParticipants.map((r) => (
                  <View key={`f-${r.uid}`} style={styles.balanceRow}>
                    <Text style={{ fontSize: 8.5, flex: 2, color: C.green }}>
                      {r.name}
                    </Text>
                    <Text
                      style={{ fontSize: 8.5, flex: 2, color: C.textMuted }}
                    >
                      Không tham gia
                    </Text>
                    <Text
                      style={{ fontSize: 8.5, flex: 1, textAlign: "right" }}
                    >
                      {fmtCurrency(Math.round(r.amount))}
                    </Text>
                  </View>
                ))}
                {settlement.perPersonReturn > 0 && (
                  <View style={styles.balanceRow}>
                    <Text style={{ fontSize: 8.5, flex: 2, color: C.green }}>
                      Tất cả ({meta.memberCount} người)
                    </Text>
                    <Text
                      style={{ fontSize: 8.5, flex: 2, color: C.textMuted }}
                    >
                      Hoàn quỹ dư
                    </Text>
                    <Text
                      style={{ fontSize: 8.5, flex: 1, textAlign: "right" }}
                    >
                      {fmtCurrency(Math.round(settlement.perPersonReturn))}/ng
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>TripKeo – Chi phí chuyến đi</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Trang ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};
