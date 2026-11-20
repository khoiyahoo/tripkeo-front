// Xác thực người gọi hàm server bằng Firebase ID token, không cần service account:
// 1) tra danh tính qua Identity Toolkit, 2) đọc tài liệu chuyến đi bằng chính token đó
//    (Firestore rules đảm bảo chỉ thành viên mới đọc được), rồi kiểm tra vai trò.

export type AuthResult =
  | { ok: true; uid: string; role: string }
  | { ok: false; status: number; error: string };

interface FirestoreValue {
  stringValue?: string;
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

export const isValidTripId = (id: unknown): id is string =>
  typeof id === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(id);

export const verifyTripRole = async (
  authorization: string | undefined,
  tripId: string,
  allowedRoles: string[]
): Promise<AuthResult> => {
  const idToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!idToken) return { ok: false, status: 401, error: "Missing token" };

  const apiKey =
    process.env.FIREBASE_API_KEY ?? process.env.VITE_FIREBASE_API_KEY;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    return {
      ok: false,
      status: 500,
      error: "Server is missing Firebase config",
    };
  }

  const lookup = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!lookup.ok) return { ok: false, status: 401, error: "Invalid token" };
  const lookupData = (await lookup.json()) as {
    users?: { localId?: string }[];
  };
  const uid = lookupData.users?.[0]?.localId;
  if (!uid) return { ok: false, status: 401, error: "Invalid token" };

  const tripRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/trips/${encodeURIComponent(tripId)}`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  if (tripRes.status === 403 || tripRes.status === 404) {
    return { ok: false, status: 403, error: "Not a member of this trip" };
  }
  if (!tripRes.ok) return { ok: false, status: 502, error: "Cannot read trip" };

  const trip = (await tripRes.json()) as {
    fields?: { members?: FirestoreValue };
  };
  const role =
    trip.fields?.members?.mapValue?.fields?.[uid]?.mapValue?.fields?.role
      ?.stringValue ?? "";
  if (!allowedRoles.includes(role)) {
    return { ok: false, status: 403, error: "Insufficient role" };
  }
  return { ok: true, uid, role };
};

/** Giới hạn tạm theo từng instance (tối đa `limit` lần mỗi giờ cho mỗi người). */
const hits = new Map<string, number[]>();
export const rateLimited = (key: string, limit = 30): boolean => {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
};
