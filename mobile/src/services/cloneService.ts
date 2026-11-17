import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { ACTIVITY_TYPE_CONFIG } from "@/constants/trip";
import { db } from "@/lib/firebase";
import { incrementCloneCount } from "@/services/communityService";
import { createTrip } from "@/services/tripService";
import { addDays } from "@/utils/cover";

import type { CommunityPost } from "@/types/community";
import type { ActivityType } from "@/types/trip";

interface CloneUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

/**
 * Tạo chuyến đi mới từ lịch trình của bài cộng đồng (không clone chi phí và thành viên).
 * startDate: YYYY-MM-DD. Trả về id chuyến mới.
 */
export const cloneItineraryToTrip = async (
  post: CommunityPost,
  user: CloneUser,
  tripName: string,
  startDate: string,
  coverImage: string
): Promise<string> => {
  const snapshot = post.itinerarySnapshot;
  if (!snapshot || snapshot.length === 0)
    throw new Error("No itinerary to clone");

  const endDate = addDays(startDate, snapshot.length - 1);

  const tripId = await createTrip(
    {
      name: tripName,
      destination: post.destination,
      coverImage,
      startDate,
      endDate,
      currency: "VND",
    },
    user.uid,
    user.displayName ?? "Ẩn danh",
    user.photoURL ?? "",
    user.email ?? ""
  );

  for (const day of snapshot) {
    const actDate = addDays(startDate, day.dayNumber - 1);
    let order = 0;
    for (const act of day.activities) {
      // Snapshot cũ lưu nhãn ("Di chuyển"), snapshot mới lưu key ("transport")
      const entry = Object.entries(ACTIVITY_TYPE_CONFIG).find(
        ([key, cfg]) => key === act.category || cfg.label === act.category
      );
      const category = (entry?.[0] ?? "other") as ActivityType;
      await addDoc(collection(db, "trips", tripId, "activities"), {
        date: actDate,
        title: act.title,
        startTime: act.startTime ?? null,
        category,
        location: act.location ?? null,
        order: order++,
        createdBy: user.uid,
        type: "shared",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  await incrementCloneCount(post.id);
  return tripId;
};
