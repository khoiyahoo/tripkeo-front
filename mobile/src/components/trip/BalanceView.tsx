import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { Card, Empty, Initial, StatCard } from "@/components/trip/ui";
import { useDebtPayments } from "@/hooks/useDebtPayments";
import { cn } from "@/lib/utils";
import { buildBalanceView } from "@/utils/balance";
import { formatCurrency } from "@/utils/format";

import type { ExpenseSummary } from "@/services/expenseService";
import type { DebtSettlement, MemberBalance } from "@/types/firestore";

interface Props {
  tripId: string;
  summary: ExpenseSummary;
  balances: MemberBalance[];
  debts: DebtSettlement[];
  canTogglePayment: boolean;
  /** Nhận các khoản nợ chưa trả (đã điều chỉnh) để đưa vào PDF */
  onExport: (
    balances: MemberBalance[],
    debts: DebtSettlement[]
  ) => Promise<void>;
}

export const BalanceView = ({
  tripId,
  summary,
  balances,
  debts,
  canTogglePayment,
  onExport,
}: Props) => {
  const [isExporting, setIsExporting] = useState(false);
  const {
    paymentHistory,
    settlementStatuses,
    handleToggleSettlementPaid,
    isTogglingSettlement,
  } = useDebtPayments({ tripId });

  const confirmToggle = (d: DebtSettlement, paid: boolean) =>
    Alert.alert(
      paid ? "Hoàn tác thanh toán" : "Đánh dấu đã trả",
      `${d.fromName} → ${d.toName}: ${formatCurrency(d.amount)}`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: () =>
            handleToggleSettlementPaid(d.fromName, d.toName, !paid).catch(
              (err) =>
                Alert.alert(
                  "Lỗi",
                  err instanceof Error
                    ? err.message
                    : "Không thể cập nhật trạng thái thanh toán"
                )
            ),
        },
      ]
    );

  const { settledDebts, adjustedBalances, paymentNotes, isPaid } = useMemo(
    () => buildBalanceView(balances, debts, paymentHistory, settlementStatuses),
    [balances, debts, paymentHistory, settlementStatuses]
  );

  const doExport = async () => {
    setIsExporting(true);
    try {
      await onExport(
        adjustedBalances,
        settledDebts.filter((d) => !isPaid(d))
      );
    } catch {
      Alert.alert("Lỗi", "Không thể xuất PDF. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <StatCard
          label="Tổng chi tiêu"
          value={formatCurrency(summary.totalSpent)}
        />
        <StatCard label="Số chi tiêu" value={String(summary.expenseCount)} />
        <StatCard
          label="Số ngày"
          value={String(summary.dateRangeDays || "—")}
        />
      </View>

      <Pressable
        className="h-11 flex-row items-center justify-center gap-2 rounded-xl border border-outline-variant active:opacity-70"
        disabled={isExporting}
        onPress={doExport}
      >
        {isExporting ? (
          <ActivityIndicator color="#abbbc2" />
        ) : (
          <Ionicons color="#abbbc2" name="document-text-outline" size={18} />
        )}
        <Text className="font-medium text-on-surface">Xuất PDF chi tiêu</Text>
      </Pressable>

      <Card title="Số dư từng người">
        {adjustedBalances.length === 0 ? (
          <Empty text="Chưa có dữ liệu" />
        ) : (
          adjustedBalances.map((b) => {
            const net = Math.round(b.net);
            return (
              <View className="flex-row items-center gap-3" key={b.name}>
                <Initial name={b.name} />
                <View className="flex-1">
                  <Text
                    className="font-medium text-on-surface text-sm"
                    numberOfLines={1}
                  >
                    {b.name}
                  </Text>
                  <Text className="text-on-surface-variant text-xs">
                    Đã trả {formatCurrency(b.totalPaid)} · Phần chịu{" "}
                    {formatCurrency(b.totalOwed)} {paymentNotes.get(b.name)}
                  </Text>
                </View>
                <Text
                  className={cn(
                    "font-semibold text-sm",
                    net > 0
                      ? "text-success-500"
                      : net < 0
                        ? "text-error-500"
                        : "text-on-surface-variant"
                  )}
                >
                  {net > 0
                    ? `+${formatCurrency(net)}`
                    : net < 0
                      ? `−${formatCurrency(Math.abs(net))}`
                      : formatCurrency(0)}
                </Text>
              </View>
            );
          })
        )}
      </Card>

      {settledDebts.length > 0 && (
        <Card title="Ai trả ai?">
          {settledDebts.map((d) => {
            const paid = isPaid(d);
            return (
              <Pressable
                className="flex-row items-center gap-2 rounded-xl border border-outline-variant p-3"
                disabled={!canTogglePayment || isTogglingSettlement}
                key={`${d.fromName}-${d.toName}`}
                onPress={() => confirmToggle(d, paid)}
              >
                <Initial
                  className="h-7 w-7 bg-error-100"
                  name={d.fromName}
                  textClassName="text-error-700 text-xs"
                />
                <Text
                  className="max-w-20 font-medium text-error-500 text-sm"
                  numberOfLines={1}
                >
                  {d.fromName}
                </Text>
                <Ionicons color="#abbbc2" name="arrow-forward" size={16} />
                <Initial
                  className="h-7 w-7 bg-success-100"
                  name={d.toName}
                  textClassName="text-success-700 text-xs"
                />
                <Text
                  className="max-w-20 font-medium text-sm text-success-500"
                  numberOfLines={1}
                >
                  {d.toName}
                </Text>
                <View className="flex-1 items-end">
                  <Text className="font-bold text-on-surface text-sm">
                    {formatCurrency(d.amount)}
                  </Text>
                  {paid ? (
                    <Text className="text-success-500 text-xs">Đã trả</Text>
                  ) : canTogglePayment ? (
                    <Text className="text-primary-400 text-xs">
                      Đánh dấu đã trả
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </Card>
      )}
    </View>
  );
};
