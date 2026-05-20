import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    return res.status(500).json({
      error: "Server is missing BREVO_API_KEY",
    });
  }

  const { toEmail, fromName, tripName, role, inviteLink } = req.body ?? {};

  if (!toEmail || !fromName || !tripName || !role || !inviteLink) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const roleLabel =
    role === "editor"
      ? "Biên tập"
      : role === "treasurer"
        ? "Thủ quỹ"
        : "Thành viên";
  const senderEmail = process.env.SENDER_EMAIL ?? "khoiyahoo@gmail.com";
  const senderName = process.env.SENDER_NAME ?? "TripKeo";

  // Derive the app origin from the invite link (e.g. https://tripkeo.app)
  const appOrigin = new URL(inviteLink as string).origin;
  const logoUrl = `${appOrigin}/logo.webp`;

  // App primary: #eb5757 (primary-500), button hover: #d84d4d (primary-600)
  const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${fromName} mời bạn tham gia "${tripName}"</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header accent bar -->
          <tr>
            <td style="background:linear-gradient(135deg,#eb5757 0%,#d84d4d 100%);height:6px;font-size:0;">&nbsp;</td>
          </tr>
          <!-- Logo -->
          <tr>
            <td align="center" style="padding:28px 32px 20px;">
              <img src="${logoUrl}" alt="TripKeo" height="36" style="display:block;height:36px;object-fit:contain;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0 32px 32px;">
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3;">Bạn nhận được lời mời!</h2>
              <p style="margin:0 0 12px;font-size:16px;line-height:1.7;color:#444444;">
                <strong style="color:#1a1a1a;">${fromName}</strong> đã mời bạn tham gia chuyến đi
                <strong style="color:#eb5757;">"${tripName}"</strong>.
              </p>
              <!-- Role badge -->
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#444444;">
                Vai trò của bạn:
                <span style="display:inline-block;background:#fff1f1;color:#eb5757;font-weight:600;font-size:14px;padding:3px 12px;border-radius:20px;border:1px solid #ffc5c5;">${roleLabel}</span>
              </p>
              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${inviteLink}"
                       style="display:inline-block;background:#eb5757;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;letter-spacing:0.2px;mso-padding-alt:0;text-align:center;">
                      ✈&nbsp; Tham gia ngay
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 4px;font-size:13px;color:#888888;text-align:center;">Link sẽ hết hạn sau 7 ngày.</p>
              <p style="margin:0;font-size:12px;color:#aaaaaa;text-align:center;word-break:break-all;">
                <a href="${inviteLink}" style="color:#eb5757;text-decoration:none;">${inviteLink}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#fafafa;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#999999;text-align:center;">
                Email này được gửi tự động từ <strong style="color:#eb5757;">TripKeo</strong>. Vui lòng không trả lời email này.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
