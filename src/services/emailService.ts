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
  const res = await fetch("/api/send-invite", {
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
