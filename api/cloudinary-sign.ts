import type { VercelRequest, VercelResponse } from "@vercel/node";

import { rateLimited, verifyTripRole } from "./_lib/auth";
import {
  ALLOWED_FORMATS,
  isValidTripId,
  newReceiptId,
  receiptFolder,
  signParams,
} from "./_lib/cloudinary";

/**
 * Ký yêu cầu tải ảnh bill lên Cloudinary.
 * Chỉ chủ chuyến / thủ quỹ (người được thêm chi tiêu) của chuyến đó mới được ký.
 */
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

  const { tripId } = req.body ?? {};
  if (!isValidTripId(tripId)) {
    return res.status(400).json({ error: "Invalid tripId" });
  }

  const auth = await verifyTripRole(req.headers.authorization, tripId, [
    "owner",
    "treasurer",
  ]);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  if (rateLimited(`sign:${auth.uid}`)) {
    return res.status(429).json({ error: "Too many uploads, try later" });
  }

  const folder = receiptFolder(tripId);
  const publicId = newReceiptId();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    allowed_formats: ALLOWED_FORMATS,
    folder,
    public_id: publicId,
    timestamp,
  };

  return res.status(200).json({
    cloudName,
    apiKey,
    ...params,
    signature: signParams(params, apiSecret),
    fullPublicId: `${folder}/${publicId}`,
  });
}
