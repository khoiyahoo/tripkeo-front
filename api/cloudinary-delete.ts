import type { VercelRequest, VercelResponse } from "@vercel/node";

import { rateLimited, verifyTripRole } from "./_lib/auth";
import { isOwnReceipt, isValidTripId, signParams } from "./_lib/cloudinary";

/** Xóa ảnh bill khỏi Cloudinary (khi xóa khoản chi hoặc thay/gỡ ảnh). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return res
      .status(500)
      .json({ error: "Server is missing Cloudinary config" });
  }

  const { tripId, publicId } = req.body ?? {};
  if (!isValidTripId(tripId) || !isOwnReceipt(publicId, tripId)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const auth = await verifyTripRole(req.headers.authorization, tripId, [
    "owner",
    "treasurer",
  ]);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  if (rateLimited(`delete:${auth.uid}`, 100)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: "true", public_id: publicId, timestamp };
  const form = new URLSearchParams({
    api_key: apiKey,
    invalidate: "true",
    public_id: publicId,
    signature: signParams(params, apiSecret),
    timestamp: String(timestamp),
  });

  const result = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`,
    { method: "POST", body: form }
  );
  if (!result.ok) return res.status(502).json({ error: "Cloudinary error" });
  const data = (await result.json()) as { result?: string };
  // "not found" coi như đã xóa (ảnh không còn tồn tại)
  return res.status(200).json({ ok: true, result: data.result });
}
