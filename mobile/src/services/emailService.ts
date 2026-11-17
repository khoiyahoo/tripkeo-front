import { getAppUrl } from "@/lib/appUrl";

interface SendInviteEmailParams {
  toEmail: string;
  fromName: string;
  tripName: string;
  role: string;
  inviteLink: string;
}

// App không có server riêng: gọi API gửi email đang chạy trên web (Vercel).
export const sendInviteEmail = async (
  params: SendInviteEmailParams
): Promise<void> => {
  // fetch của React Native không có timeout mặc định; tự hủy sau 10 giây
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(`${getAppUrl()}/api/send-invite`, {
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
