import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    return res.status(500).json({
      error: "Server is missing VITE_BREVO_API_KEY",
    });
  }

  const { toEmail, fromName, tripName, role, inviteLink } = req.body ?? {};

  if (!toEmail || !fromName || !tripName || !role || !inviteLink) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const roleLabel =
    role === "editor" ? "Biên tập" : role === "treasurer" ? "Thủ quỹ" : "Xem";
  const senderEmail = process.env.SENDER_EMAIL ?? "khoiyahoo@gmail.com";
  const senderName = process.env.SENDER_NAME ?? "TripKeo";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 24px; color: #eb5757; margin: 0;">TripKeo</h1>
  </div>
  <h2 style="font-size: 20px; margin-bottom: 8px;">Xin chào!</h2>
  <p style="font-size: 16px; line-height: 1.6;">
    <strong>${fromName}</strong> đã mời bạn tham gia chuyến đi
    <strong>"${tripName}"</strong> với vai trò <strong>${roleLabel}</strong>.
  </p>
  <p style="font-size: 16px; line-height: 1.6;">Nhấn vào nút bên dưới để tham gia:</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${inviteLink}"
       style="background: #eb5757; color: white; padding: 14px 32px;
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
  `.trim();

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail }],
        subject: `${fromName} mời bạn tham gia "${tripName}"`,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Brevo API error:", response.status, details);
      return res.status(500).json({ error: "Failed to send email" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    return res.status(500).json({ error: "Failed to send email" });
  }
}
