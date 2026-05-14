import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const resendApiKey = process.env.VITE_RESEND_API_KEY;
  if (!resendApiKey) {
    return res.status(500).json({
      error: "Server is missing VITE_RESEND_API_KEY",
    });
  }

  const { toEmail, fromName, tripName, role, inviteLink } = req.body ?? {};

  if (!toEmail || !fromName || !tripName || !role || !inviteLink) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const roleLabel = role === "editor" ? "Biên tập" : "Xem";
  const senderEmail =
    process.env.VITE_SENDER_EMAIL ?? "TripKeo <onboarding@resend.dev>";
  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: senderEmail,
      to: toEmail,
      subject: `${fromName} mời bạn tham gia "${tripName}"`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 24px; color: #0D9488; margin: 0;">TripKeo</h1>
  </div>
  <h2 style="font-size: 20px; margin-bottom: 8px;">Xin chào!</h2>
  <p style="font-size: 16px; line-height: 1.6;">
    <strong>${fromName}</strong> đã mời bạn tham gia chuyến đi
    <strong>"${tripName}"</strong> với vai trò <strong>${roleLabel}</strong>.
  </p>
  <p style="font-size: 16px; line-height: 1.6;">Nhấn vào nút bên dưới để tham gia:</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${inviteLink}"
       style="background: #0D9488; color: white; padding: 14px 32px;
              border-radius: 10px; text-decoration: none; display: inline-block;
              font-size: 16px; font-weight: 600;">
      Tham gia ngay
    </a>
  </div>
  <p style="color: #666; font-size: 14px;">Link sẽ hết hạn sau 7 ngày.</p>
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
  <p style="color: #999; font-size: 12px; text-align: center;">— TripKeo Team</p>
</body>
</html>
      `.trim(),
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    return res.status(500).json({ error: "Failed to send email" });
  }
}
