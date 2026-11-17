import type { SplitMethod } from "@/types/firestore";

// ─── Split calculation ───────────────────────────────────────
// Quy tắc: tổng phần chia của một khoản chi LUÔN bằng số tiền chi (tự chuẩn hóa),
// dù dữ liệu chia sai (% không đủ 100, tổng tiền lệch, người đã bị xóa...).

export type SplitIssueCode =
  | "percentage_sum"
  | "amount_sum"
  | "unknown_members"
  | "no_participants";

const EPS = 0.5;

const weightOf = (
  method: SplitMethod,
  uid: string,
  details?: Record<string, number>
): number => {
  if (method === "shares") return Math.max(details?.[uid] ?? 1, 0);
  return Math.max(details?.[uid] ?? 0, 0);
};

/**
 * Trả về map tên → số tiền mỗi người phải chịu.
 * - Có `validMembers`: người không còn trong danh sách bị loại, phần của họ
 *   được chia lại cho những người còn lại theo cùng tỷ lệ.
 * - Không còn ai hợp lệ: chia đều cho tất cả `validMembers`.
 * - Tổng trọng số ≤ 0: chia đều.
 */
export function getOwedPerPerson(
  amount: number,
  splitBetween: string[],
  splitMethod: SplitMethod,
  splitDetails?: Record<string, number>,
  validMembers?: string[]
): Record<string, number> {
  const result: Record<string, number> = {};
  const valid = validMembers ? new Set(validMembers) : null;

  let participants = valid
    ? [...new Set(splitBetween)].filter((u) => valid.has(u))
    : [...new Set(splitBetween)];

  // Không còn người nào chịu khoản này → chia đều cho cả nhóm hiện tại
  if (participants.length === 0) {
    if (!validMembers || validMembers.length === 0) return result;
    participants = [...new Set(validMembers)];
    for (const uid of participants) result[uid] = amount / participants.length;
    return result;
  }

  const equal = () => {
    for (const uid of participants) result[uid] = amount / participants.length;
    return result;
  };

  if (splitMethod === "equal") return equal();

  // Chia theo số tiền cụ thể: nếu hợp lệ tuyệt đối thì giữ nguyên số đã nhập
  if (splitMethod === "amount") {
    const allValid = participants.length === splitBetween.length;
    const sum = participants.reduce(
      (s, u) => s + weightOf("amount", u, splitDetails),
      0
    );
    if (allValid && Math.abs(sum - amount) < EPS) {
      for (const uid of participants) {
        result[uid] = weightOf("amount", uid, splitDetails);
      }
      return result;
    }
  }

  const total = participants.reduce(
    (s, u) => s + weightOf(splitMethod, u, splitDetails),
    0
  );
  if (total <= 0) return equal();

  for (const uid of participants) {
    result[uid] = (amount * weightOf(splitMethod, uid, splitDetails)) / total;
  }
  return result;
}

/** Liệt kê các vấn đề dữ liệu chia của một khoản chi (để báo cho người dùng). */
export function getSplitIssues(
  amount: number,
  splitBetween: string[],
  splitMethod: SplitMethod,
  splitDetails: Record<string, number> | undefined,
  validMembers: string[]
): SplitIssueCode[] {
  const issues: SplitIssueCode[] = [];
  const valid = new Set(validMembers);
  const known = splitBetween.filter((u) => valid.has(u));

  if (splitBetween.length === 0) return ["no_participants"];
  if (known.length < splitBetween.length) issues.push("unknown_members");
  if (known.length === 0) {
    issues.push("no_participants");
    return issues;
  }
  if (splitMethod === "percentage") {
    const sum = splitBetween.reduce((s, u) => s + (splitDetails?.[u] ?? 0), 0);
    if (Math.abs(sum - 100) > 0.01) issues.push("percentage_sum");
  }
  if (splitMethod === "amount") {
    const sum = splitBetween.reduce((s, u) => s + (splitDetails?.[u] ?? 0), 0);
    if (Math.abs(sum - amount) >= EPS) issues.push("amount_sum");
  }
  return issues;
}
