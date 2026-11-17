interface SendInviteEmailParams {
  toEmail: string;
  fromName: string;
  tripName: string;
  role: string;
  inviteLink: string;
}

export const sendInviteEmail = async (
  params: SendInviteEmailParams
): Promise<void> => {
  // Không để API chậm làm treo cả luồng tạo chuyến/mời thành viên: tự hủy sau 10 giây
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch("/api/send-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
  } catch {
    throw new Error("Failed to send invitation email");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Failed to send invitation email");
  }
};
