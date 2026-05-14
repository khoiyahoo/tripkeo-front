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
    throw new Error("Failed to send invitation email");
  }
};
