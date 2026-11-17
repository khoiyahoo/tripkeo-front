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
  const res = await fetch(`${getAppUrl()}/api/send-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Failed to send invitation email");
  }
};
