import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { ExpenseFormModal } from "@/components/trip/ExpenseFormModal";

import { Card, Empty, StatCard } from "@/components/trip/ui";
import { EXPENSE_CATEGORY_CONFIG } from "@/constants/trip";
import { cn } from "@/lib/utils";
import { formatCurrency, timestampToDateStr } from "@/utils/format";

import type { ExpenseSummary } from "@/services/expenseService";
import type { CreateExpenseInput, ExpenseWithId } from "@/types/firestore";

const SPLIT_METHOD_LABELS: Record<string, string> = {
  equal: "đều",
  percentage: "%",
  amount: "số tiền",
  shares: "phần",
};

const CategorySummary = ({ expenses }: { expenses: ExpenseWithId[] }) => {
  const byCat: Record<string, number> = {};
  for (const e of expenses)
    byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <View className="gap-3">
      {Object.entries(byCat)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => {
          const cfg =
            EXPENSE_CATEGORY_CONFIG[
              cat as keyof typeof EXPENSE_CATEGORY_CONFIG
            ] ?? EXPENSE_CATEGORY_CONFIG.other;
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return (
            <View className="gap-1.5" key={cat}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View
                    className={cn("h-2.5 w-2.5 rounded-full", cfg.dotColor)}
                  />
                  <Text className="text-on-surface text-sm">{cfg.label}</Text>
                </View>
                <Text className="font-medium text-on-surface text-sm">
                  {formatCurrency(amount)}
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-surface-dim">
                <View
                  className={cn("h-full rounded-full", cfg.dotColor)}
                  style={{ width: `${pct}%` }}
                />
              </View>
            </View>
          );
        })}
    </View>
  );
};

interface Props {
  expenses: ExpenseWithId[];
  summary: ExpenseSummary;
  costMembers: string[];
  isLoading: boolean;
  canEdit: boolean;
  onAdd: (input: CreateExpenseInput) => Promise<unknown>;
  onUpdate: (id: string, input: Partial<CreateExpenseInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ExpensesView = ({
  expenses,
  summary,
  costMembers,
  isLoading,
  canEdit,
  onAdd,
  onUpdate,
  onDelete,
}: Props) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseWithId | null>(null);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e: ExpenseWithId) => {
    setEditing(e);
    setFormOpen(true);
  };
  const confirmDelete = (e: ExpenseWithId) =>
    Alert.alert("Xóa chi tiêu", `Xóa "${e.description}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () =>
          onDelete(e.id).catch(() =>
            Alert.alert("Lỗi", "Không thể xóa chi tiêu. Vui lòng thử lại.")
          ),
      },
    ]);

  if (isLoading) return <Empty text="Đang tải chi tiêu..." />;

  return (
    <View className="gap-4">
      <ExpenseFormModal
        costMembers={costMembers}
        initialData={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) =>
          editing ? onUpdate(editing.id, input) : onAdd(input)
        }
        visible={formOpen}
      />
      <View className="flex-row gap-3">
        <StatCard
          label="Tổng chi tiêu"
          value={formatCurrency(summary.totalSpent)}
        />
        <StatCard label="Số chi tiêu" value={String(summary.expenseCount)} />
        <StatCard
          label="TB / người"
          value={
            costMembers.length > 0
              ? formatCurrency(
                  Math.round(summary.totalSpent / costMembers.length)
                )
              : "—"
          }
        />
      </View>

      {expenses.length > 0 && (
        <Card title="Chi tiêu theo danh mục">
          <CategorySummary expenses={expenses} />
        </Card>
      )}

      {canEdit && (
        <Pressable
          className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary-500 active:bg-primary-600"
          onPress={openAdd}
        >
          <Ionicons color="#fff" name="add" size={20} />
          <Text className="font-semibold text-white">Thêm chi tiêu</Text>
        </Pressable>
      )}

      <Card title="Danh sách chi tiêu">
        {expenses.length === 0 ? (
          <Empty text="Chưa có chi tiêu nào." />
        ) : (
          expenses.map((e) => {
            const cfg =
              EXPENSE_CATEGORY_CONFIG[e.category] ??
              EXPENSE_CATEGORY_CONFIG.other;
            const method = SPLIT_METHOD_LABELS[e.splitMethod ?? "equal"];
            return (
              <View className="flex-row items-center gap-3" key={e.id}>
                <View
                  className={cn(
                    "h-9 w-9 items-center justify-center rounded-lg",
                    cfg.bgColor
                  )}
                >
                  <View
                    className={cn("h-2.5 w-2.5 rounded-full", cfg.dotColor)}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="font-medium text-on-surface text-sm"
                    numberOfLines={1}
                  >
                    {e.description}
                  </Text>
                  <Text className="text-on-surface-variant text-xs">
                    {timestampToDateStr(e.date)} · {e.paidBy || "?"} trả · chia{" "}
                    {method} ({e.splitBetween?.length ?? 0} người)
                  </Text>
                </View>
                <Text className="font-semibold text-on-surface text-sm">
                  {formatCurrency(e.amount)}
                </Text>
                {canEdit && (
                  <View className="flex-row gap-3">
                    <Pressable hitSlop={8} onPress={() => openEdit(e)}>
                      <Ionicons
                        color="#eb5757"
                        name="create-outline"
                        size={18}
                      />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => confirmDelete(e)}>
                      <Ionicons
                        color="#eb5757"
                        name="trash-outline"
                        size={18}
                      />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
      </Card>
    </View>
  );
};
