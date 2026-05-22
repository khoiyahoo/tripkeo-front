/**
 * @react-pdf/renderer document for itinerary export.
 * Fonts are loaded from /public/fonts/ (copied from @fontsource/noto-sans)
 * to support Vietnamese characters via WOFF.
 */
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  ACTIVITY_TYPE_CONFIG,
  getTimePeriod,
  TIME_PERIOD_CONFIG,
  TIME_PERIODS,
} from "@/constants/trip";

import type { ActivityWithId, PersonalActivityWithId } from "@/types/firestore";
import type { TimePeriod } from "@/types/trip";

// ─── Font Registration ────────────────────────────────────────
// Use a single comprehensive TTF file per weight (covers Latin + Vietnamese).
// Multiple WOFF subset files with the same family+weight are NOT supported —
// @react-pdf/renderer keeps only the last registered source, and a
// Vietnamese-only subset is missing the basic Latin alphabet.
Font.register({
  family: "NotoSans",
  fonts: [
    { src: "/fonts/NotoSans-Regular.ttf" },
    { src: "/fonts/NotoSans-Bold.ttf", fontWeight: 700 },
  ],
});

// Prevent line-breaking on hyphens inside table cells
Font.registerHyphenationCallback((word) => [word]);

// ─── Types ────────────────────────────────────────────────────
export interface TripMeta {
  title: string;
  destination?: string;
  startDate?: string; // formatted display string, e.g. "12/10/2024"
  endDate?: string;
  memberNames: string[];
}

export interface ItineraryPdfProps {
  tripMeta: TripMeta;
  days: { dayNumber: number; date: string }[];
  activitiesByDate: Record<string, ActivityWithId[]>;
  /** Optional personal activities to include as a separate section. */
  personalActivitiesByDate?: Record<string, PersonalActivityWithId[]>;
  /** Shared activities lookup (same source as activitiesByDate, flattened) for conflict markers. */
  allSharedActivities?: ActivityWithId[];
}

// ─── Helpers ─────────────────────────────────────────────────
const formatDate = (dateStr: string): string =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

// ─── Styles ───────────────────────────────────────────────────
const C = {
  // primary: red (#eb5757) — used for document header/title
  primary: "#eb5757",
  primaryLight: "#fff1f1",
  primaryBorder: "#ffc5c5",
  // tertiary: amber (#f0a500) — used for itinerary section headers
  tertiary: "#f0a500",
  tertiaryLight: "#fff8e6",
  tertiaryBorder: "#ffdf80",
  dayBg: "#fff8e6",
  periodBg: "#f8fafc",
  headerBg: "#eb5757",
  border: "#e2e8f0",
  text: "#1e293b",
  textMuted: "#64748b",
  white: "#ffffff",
  amber: "#805500",
  amberBg: "#fff8e6",
  orange: "#a56f00",
  indigo: "#3730a3",
};

const PERIOD_COLORS: Record<TimePeriod, { bg: string; text: string }> = {
  morning: { bg: "#fffbeb", text: C.amber },
  afternoon: { bg: "#fff7ed", text: C.orange },
  evening: { bg: "#eef2ff", text: C.indigo },
};

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

  // ── Header ──
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: C.headerBg,
    marginBottom: 4,
  },
  headerMeta: {
    flexDirection: "row",
    gap: 16,
  },
  headerMetaText: {
    fontSize: 8.5,
    color: C.textMuted,
  },
  headerMetaBold: {
    fontWeight: 700,
    color: C.text,
  },

  // ── Table wrapper ──
  table: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
  },

  // ── Column header row ──
  colHeader: {
    flexDirection: "row",
    backgroundColor: C.headerBg,
  },
  colHeaderCell: {
    color: C.white,
    fontWeight: 700,
    fontSize: 8,
    paddingVertical: 5,
    paddingHorizontal: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Day header row ──
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.dayBg,
    borderTopWidth: 1,
    borderTopColor: C.tertiaryBorder,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  dayHeaderText: {
    fontWeight: 700,
    fontSize: 9.5,
    color: C.tertiary,
  },
  dayCount: {
    marginLeft: 6,
    fontSize: 8,
    color: C.textMuted,
  },

  // ── Period header row ──
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  periodLabel: {
    fontSize: 8,
    fontWeight: 700,
  },

  // ── Activity row ──
  activityRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.border,
    minHeight: 20,
  },
  activityRowAlt: {
    backgroundColor: "#fafafa",
  },
  cell: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 8.5,
    color: C.text,
  },
  cellBold: {
    fontWeight: 700,
  },
  cellMuted: {
    color: C.textMuted,
    fontSize: 8,
  },

  // ── Column widths (landscape A4 = 841.89pt, margins 56pt → 785.89pt usable) ──
  colTime: { width: 52 },
  colActivity: { flex: 1 },
  colType: { width: 68 },
  colCost: { width: 64 },
  colNote: { width: 120 },
  colLocation: { width: 110 },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7.5,
    color: C.textMuted,
  },

  // ── Empty state ──
  emptyRow: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  emptyText: {
    fontSize: 8,
    color: C.textMuted,
    fontStyle: "italic",
  },
});

// ─── Column Header Row ────────────────────────────────────────
const ColHeaders = () => (
  <View style={styles.colHeader}>
    <Text style={[styles.colHeaderCell, styles.colTime]}>Thời gian</Text>
    <Text style={[styles.colHeaderCell, styles.colActivity]}>Hoạt động</Text>
    <Text style={[styles.colHeaderCell, styles.colType]}>Loại</Text>
    <Text style={[styles.colHeaderCell, styles.colLocation]}>Địa điểm</Text>
    <Text style={[styles.colHeaderCell, styles.colCost]}>Chi phí</Text>
    <Text style={[styles.colHeaderCell, styles.colNote]}>Ghi chú</Text>
  </View>
);

// ─── PDF Document ─────────────────────────────────────────────
export const ItineraryPdfDocument = ({
  tripMeta,
  days,
  activitiesByDate,
  personalActivitiesByDate,
  allSharedActivities = [],
}: ItineraryPdfProps) => {
  const totalActivities = Object.values(activitiesByDate).reduce(
    (sum, acts) => sum + acts.length,
    0
  );

  const dateRange =
    tripMeta.startDate && tripMeta.endDate
      ? `${tripMeta.startDate} – ${tripMeta.endDate}`
      : (tripMeta.startDate ?? "");

  const generatedOn = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <Document
      title={`${tripMeta.title} – Lịch trình`}
      author="TripKeo"
      subject="Lịch trình chuyến đi"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* ── Trip header ── */}
        <View style={styles.header}>
          <Text style={styles.tripTitle}>{tripMeta.title}</Text>
          <View style={styles.headerMeta}>
            {tripMeta.destination && (
              <Text style={styles.headerMetaText}>
                Điểm đến:
                <Text style={styles.headerMetaBold}>
                  {tripMeta.destination}
                </Text>
              </Text>
            )}
            {dateRange && (
              <Text style={styles.headerMetaText}>
                Ngày đi:
                <Text style={styles.headerMetaBold}>{dateRange}</Text>
              </Text>
            )}
            <Text style={styles.headerMetaText}>
              Tổng hoạt động:
              <Text style={styles.headerMetaBold}>{totalActivities}</Text>
            </Text>
          </View>
        </View>

        {/* ── Table ── */}
        <View style={styles.table}>
          <ColHeaders />

          {days.map((day) => {
            const dayActivities = activitiesByDate[day.date] ?? [];

            // Group by period, sorted by order then startTime
            const byPeriod: Record<TimePeriod, ActivityWithId[]> = {
              morning: [],
              afternoon: [],
              evening: [],
            };
            for (const a of dayActivities) {
              byPeriod[getTimePeriod(a.startTime)].push(a);
            }
            for (const p of TIME_PERIODS) {
              byPeriod[p].sort((a, b) =>
                a.order !== b.order
                  ? a.order - b.order
                  : (a.startTime ?? "").localeCompare(b.startTime ?? "")
              );
            }

            return (
              <View key={day.date}>
                {/* Day header */}
                <View style={styles.dayHeaderRow}>
                  <Text style={styles.dayHeaderText}>
                    {`Ngày ${day.dayNumber}  –  ${formatDate(day.date)}`}
                  </Text>
                  {dayActivities.length > 0 && (
                    <Text style={styles.dayCount}>
                      ({dayActivities.length} hoạt động)
                    </Text>
                  )}
                </View>

                {/* Periods */}
                {TIME_PERIODS.map((period) => {
                  const acts = byPeriod[period];
                  if (acts.length === 0) return null;

                  const pColors = PERIOD_COLORS[period];
                  const pLabel = TIME_PERIOD_CONFIG[period].label;

                  return (
                    <View key={period}>
                      {/* Period header */}
                      <View
                        style={[
                          styles.periodRow,
                          { backgroundColor: pColors.bg },
                        ]}
                      >
                        <Text
                          style={[styles.periodLabel, { color: pColors.text }]}
                        >
                          {pLabel}
                        </Text>
                      </View>

                      {/* Activity rows */}
                      {acts.map((activity, idx) => {
                        const typeConfig =
                          ACTIVITY_TYPE_CONFIG[activity.category];
                        return (
                          <View
                            key={activity.id}
                            style={[
                              styles.activityRow,
                              ...(idx % 2 !== 0 ? [styles.activityRowAlt] : []),
                            ]}
                          >
                            <Text
                              style={[
                                styles.cell,
                                styles.colTime,
                                styles.cellMuted,
                              ]}
                            >
                              {activity.startTime
                                ? activity.endTime
                                  ? `${activity.startTime}\n${activity.endTime}`
                                  : activity.startTime
                                : "—"}
                            </Text>
                            <Text
                              style={[
                                styles.cell,
                                styles.colActivity,
                                styles.cellBold,
                              ]}
                            >
                              {activity.title}
                            </Text>
                            <Text style={[styles.cell, styles.colType]}>
                              {typeConfig.label}
                            </Text>
                            <Text
                              style={[
                                styles.cell,
                                styles.colLocation,
                                styles.cellMuted,
                              ]}
                            >
                              {activity.location ?? "—"}
                            </Text>
                            <Text style={[styles.cell, styles.colCost]}>
                              {activity.cost != null && activity.cost > 0
                                ? formatCurrency(activity.cost)
                                : "—"}
                            </Text>
                            <Text
                              style={[
                                styles.cell,
                                styles.colNote,
                                styles.cellMuted,
                              ]}
                            >
                              {activity.note ?? "—"}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}

                {/* Empty day placeholder */}
                {dayActivities.length === 0 && (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>Chưa có hoạt động nào</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {tripMeta.memberNames.length > 0
              ? `Thành viên: ${tripMeta.memberNames.join(", ")}`
              : ""}
          </Text>
          <Text style={styles.footerText}>
            {`Xuất lúc ${generatedOn}  •  TripKeo`}
          </Text>
        </View>

        {/* Page number */}
        <Text
          style={[
            styles.footerText,
            {
              position: "absolute",
              bottom: 16,
              left: 0,
              right: 0,
              textAlign: "center",
            },
          ]}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* ── Personal itinerary — page break (only if there are personal activities) ── */}
      {personalActivitiesByDate &&
        days.some(
          (d) => (personalActivitiesByDate[d.date] ?? []).length > 0
        ) && (
          <Page size="A4" orientation="landscape" style={styles.page}>
            {/* Personal page header */}
            <View style={[styles.header, { borderBottomColor: C.primary }]}>
              <Text style={styles.tripTitle}>{tripMeta.title}</Text>
              <View style={styles.headerMeta}>
                <Text style={styles.headerMetaText}>📝 Lịch trình cá nhân</Text>
              </View>
            </View>

            <View style={styles.table}>
              <ColHeaders />

              {days.map((day) => {
                const personalActs = personalActivitiesByDate[day.date] ?? [];
                if (personalActs.length === 0) return null;

                const byPeriod: Record<TimePeriod, PersonalActivityWithId[]> = {
                  morning: [],
                  afternoon: [],
                  evening: [],
                };
                for (const a of personalActs) {
                  byPeriod[getTimePeriod(a.startTime)].push(a);
                }
                for (const p of TIME_PERIODS) {
                  byPeriod[p].sort((a, b) => {
                    const oc = (a.order ?? 9999) - (b.order ?? 9999);
                    return oc !== 0
                      ? oc
                      : (a.startTime ?? "").localeCompare(b.startTime ?? "");
                  });
                }

                return (
                  <View key={day.date}>
                    <View style={styles.dayHeaderRow}>
                      <Text style={styles.dayHeaderText}>
                        {`Ngày ${day.dayNumber}  –  ${formatDate(day.date)}`}
                      </Text>
                      <Text style={styles.dayCount}>
                        ({personalActs.length} hoạt động)
                      </Text>
                    </View>
                    {TIME_PERIODS.map((period) => {
                      const acts = byPeriod[period];
                      if (acts.length === 0) return null;
                      const pColors = PERIOD_COLORS[period];
                      const pLabel = TIME_PERIOD_CONFIG[period].label;
                      return (
                        <View key={period}>
                          <View
                            style={[
                              styles.periodRow,
                              { backgroundColor: pColors.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.periodLabel,
                                { color: pColors.text },
                              ]}
                            >
                              {pLabel}
                            </Text>
                          </View>
                          {acts.map((pa, idx) => {
                            const typeConfig =
                              ACTIVITY_TYPE_CONFIG[pa.category];
                            const hasConflict =
                              pa.startTime !== undefined &&
                              allSharedActivities.some(
                                (s) =>
                                  s.date === pa.date &&
                                  s.startTime === pa.startTime
                              );
                            return (
                              <View
                                key={pa.id}
                                style={[
                                  styles.activityRow,
                                  ...(idx % 2 !== 0
                                    ? [styles.activityRowAlt]
                                    : []),
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.cell,
                                    styles.colTime,
                                    styles.cellMuted,
                                  ]}
                                >
                                  {pa.startTime ?? "—"}
                                </Text>
                                <Text
                                  style={[
                                    styles.cell,
                                    styles.colActivity,
                                    styles.cellBold,
                                  ]}
                                >
                                  {pa.title}
                                  {hasConflict ? " ⚠️" : ""}
                                </Text>
                                <Text style={[styles.cell, styles.colType]}>
                                  {typeConfig.label}
                                </Text>
                                <Text
                                  style={[
                                    styles.cell,
                                    styles.colLocation,
                                    styles.cellMuted,
                                  ]}
                                >
                                  —
                                </Text>
                                <Text style={[styles.cell, styles.colCost]}>
                                  —
                                </Text>
                                <Text
                                  style={[
                                    styles.cell,
                                    styles.colNote,
                                    styles.cellMuted,
                                  ]}
                                >
                                  {pa.note ?? "—"}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>

            {/* Footer (same as page 1) */}
            <View style={styles.footer} fixed>
              <Text style={styles.footerText}>
                {tripMeta.memberNames.length > 0
                  ? `Thành viên: ${tripMeta.memberNames.join(", ")}`
                  : ""}
              </Text>
              <Text style={styles.footerText}>
                {`Xuất lúc ${generatedOn}  •  TripKeo`}
              </Text>
            </View>
            <Text
              style={[
                styles.footerText,
                {
                  position: "absolute",
                  bottom: 16,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                },
              ]}
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
              fixed
            />
          </Page>
        )}
    </Document>
  );
};
