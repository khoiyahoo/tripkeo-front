import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { geocodeLocation, haversineKm } from "@/services/geocodingService";
import { formatDate } from "@/utils/format";

import type { ActivityWithId, CreateActivityInput } from "@/types/firestore";

// ─── Day colours (cyclic) ──────────────────────────────────────
const DAY_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];
function getDayColor(dayIndex: number) {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

// ─── Icon factories ────────────────────────────────────────────
function makeDivIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid rgba(255,255,255,0.8);box-shadow:0 2px 6px rgba(0,0,0,0.35);cursor:pointer;">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function makeSearchIcon() {
  return L.divIcon({
    className: "",
    html: '<div style="background:#f0a500;color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🔍</div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
}

function makePoiIcon(emoji: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid rgba(255,255,255,0.9);box-shadow:0 1px 4px rgba(0,0,0,0.3);">${emoji}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

// ─── POI helpers ────────────────────────────────────────────────
interface POIItem {
  id: number;
  lat: number;
  lng: number;
  name: string;
  type: string;
}

const POI_CONFIG: Record<string, { emoji: string; color: string }> = {
  restaurant: { emoji: "🍽️", color: "#f97316" },
  hotel: { emoji: "🏨", color: "#3b82f6" },
  park: { emoji: "🌳", color: "#22c55e" },
  attraction: { emoji: "⭐", color: "#f59e0b" },
  cafe: { emoji: "☕", color: "#78350f" },
};
function poiConfig(type: string) {
  return POI_CONFIG[type] ?? { emoji: "📍", color: "#6b7280" };
}

async function fetchPOI(
  lat: number,
  lng: number,
  radius = 1200
): Promise<POIItem[]> {
  const query = `[out:json][timeout:15];(
    node["amenity"="restaurant"](around:${radius},${lat},${lng});
    node["tourism"="hotel"](around:${radius},${lat},${lng});
    node["leisure"="park"](around:${radius},${lat},${lng});
    node["tourism"="attraction"](around:${radius},${lat},${lng});
    node["amenity"="cafe"](around:${radius},${lat},${lng});
  );out body;`;
  const resp = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!resp.ok) return [];
  const json = (await resp.json()) as {
    elements: {
      id: number;
      lat: number;
      lon: number;
      tags?: Record<string, string>;
    }[];
  };
  return json.elements.map((e) => ({
    id: e.id,
    lat: e.lat,
    lng: e.lon,
    name: e.tags?.name ?? "",
    type: e.tags?.amenity ?? e.tags?.tourism ?? e.tags?.leisure ?? "other",
  }));
}

// ─── DraggableMarker ──────────────────────────────────────────
interface DraggableMarkerProps {
  activity: ActivityWithId;
  color: string;
  label: string;
  dayNumber: number;
  canEdit: boolean;
  onUpdateActivity?: (
    id: string,
    data: Partial<CreateActivityInput>
  ) => Promise<void>;
}
const DraggableMarker = ({
  activity,
  color,
  label,
  dayNumber,
  canEdit,
  onUpdateActivity,
}: DraggableMarkerProps) => {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const icon = makeDivIcon(color, label);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-create on coords/color/label change only
  useEffect(() => {
    const { lat, lng } = activity as { lat: number; lng: number };
    const marker = L.marker([lat, lng], { icon, draggable: canEdit });
    marker.addTo(map);
    markerRef.current = marker;
    const html = `<div style="min-width:160px"><div style="font-weight:700;margin-bottom:2px">${activity.title}</div><div style="color:#6b7280;font-size:12px">Ngày ${dayNumber} · ${formatDate(activity.date)}</div>${activity.startTime ? `<div style="font-size:12px;margin-top:2px">${activity.startTime}${activity.endTime ? ` – ${activity.endTime}` : ""}</div>` : ""}${activity.location ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">📍 ${activity.location}</div>` : ""}</div>`;
    marker.bindPopup(html);
    if (canEdit && onUpdateActivity) {
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onUpdateActivity(activity.id, { lat: pos.lat, lng: pos.lng });
      });
    }
    return () => {
      marker.remove();
    };
  }, [activity.lat, activity.lng, color, label]);

  return null;
};

// ─── SearchMarker ─────────────────────────────────────────────
const SearchMarker = ({
  lat,
  lng,
  name,
}: {
  lat: number;
  lng: number;
  name: string;
}) => {
  const map = useMap();
  useEffect(() => {
    const marker = L.marker([lat, lng], { icon: makeSearchIcon() });
    marker.addTo(map);
    marker.bindPopup(`<div style="font-weight:700">🔍 ${name}</div>`);
    return () => {
      marker.remove();
    };
  }, [map, lat, lng, name]);
  return null;
};

// ─── POI layer ─────────────────────────────────────────────────
const POILayer = ({ items }: { items: POIItem[] }) => {
  const map = useMap();
  useEffect(() => {
    const markers = items.slice(0, 80).map((poi) => {
      const cfg = poiConfig(poi.type);
      const m = L.marker([poi.lat, poi.lng], {
        icon: makePoiIcon(cfg.emoji, cfg.color),
        zIndexOffset: -100,
      });
      // Tooltip (hover) shows the name; popup (click) shows name + type
      if (poi.name) {
        m.bindTooltip(poi.name, {
          permanent: false,
          direction: "top",
          opacity: 0.9,
        });
        m.bindPopup(
          `<div style="font-size:12px">${cfg.emoji} <strong>${poi.name}</strong><br/><span style="color:#6b7280;font-size:11px">${poi.type}</span></div>`
        );
      } else {
        m.bindPopup(
          `<div style="font-size:12px">${cfg.emoji} ${poi.type}</div>`
        );
      }
      m.addTo(map);
      return m;
    });
    return () => {
      for (const m of markers) m.remove();
    };
  }, [map, items]);
  return null;
};

// ─── FitBoundsEffect ──────────────────────────────────────────
// Uses a lastTrigger ref to prevent re-running on every render when `points`
// is a new array reference (which would cause an infinite zoom-reset loop via ZoomTracker).
const FitBoundsEffect = ({
  points,
  trigger,
}: {
  points: [number, number][];
  trigger: number;
}) => {
  const map = useMap();
  const lastTrigger = useRef(0);
  useEffect(() => {
    if (trigger <= 0 || trigger === lastTrigger.current || points.length === 0)
      return;
    lastTrigger.current = trigger;
    if (points.length === 1) {
      map.flyTo(points[0], Math.max(map.getZoom(), 15));
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: lastTrigger ref gates re-execution; points/map are correct deps
  }, [trigger, points, map]);
  return null;
};

// ─── ZoomTracker ──────────────────────────────────────────────
const ZoomTracker = ({
  onZoomChange,
}: {
  onZoomChange: (z: number) => void;
}) => {
  useMapEvents({
    zoomend(e) {
      onZoomChange(e.target.getZoom() as number);
    },
  });
  return null;
};

// ─── DistanceLabel ─────────────────────────────────────────────
interface DistanceLabelProps {
  p1: L.LatLngExpression;
  p2: L.LatLngExpression;
  distKm: number;
}
const DistanceLabel = ({ p1, p2, distKm }: DistanceLabelProps) => {
  const map = useMap();
  useEffect(() => {
    const a = L.latLng(p1 as L.LatLngTuple);
    const b = L.latLng(p2 as L.LatLngTuple);
    const mid = L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
    const label = L.marker(mid, {
      icon: L.divIcon({
        className: "",
        html: `<div style="background:rgba(255,255,255,0.85);border-radius:4px;padding:1px 5px;font-size:10px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.2)">${distKm.toFixed(1)} km</div>`,
        iconAnchor: [24, 10],
      }),
      interactive: false,
    });
    label.addTo(map);
    return () => {
      label.remove();
    };
  }, [map, p1, p2, distKm]);
  return null;
};

// ─── Props ────────────────────────────────────────────────────
interface MapTabProps {
  tripId: string;
  days: { dayNumber: number; date: string }[];
  activitiesByDate: Record<string, ActivityWithId[]>;
  canEdit?: boolean;
  onUpdateActivity?: (
    id: string,
    data: Partial<CreateActivityInput>
  ) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────
export const MapTab = ({
  days,
  activitiesByDate,
  canEdit = false,
  onUpdateActivity,
}: MapTabProps) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showPOI, setShowPOI] = useState(false);
  const [poiItems, setPoiItems] = useState<POIItem[]>([]);
  const [isLoadingPOI, setIsLoadingPOI] = useState(false);
  const [zoom, setZoom] = useState(12);
  const [fitTrigger, setFitTrigger] = useState(0);

  interface GeoActivity extends ActivityWithId {
    lat: number;
    lng: number;
  }
  const geoByDay: Map<number, GeoActivity[]> = new Map();
  for (const day of days) {
    const acts = activitiesByDate[day.date] ?? [];
    const geo = acts
      .filter(
        (a): a is GeoActivity =>
          typeof (a as GeoActivity).lat === "number" &&
          typeof (a as GeoActivity).lng === "number"
      )
      .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
    if (geo.length > 0) geoByDay.set(day.dayNumber, geo);
  }

  const allGeo = [...geoByDay.entries()].flatMap(([, acts]) => acts);
  const visibleDays =
    selectedDay === null ? [...geoByDay.keys()] : [selectedDay];
  const visibleGeo = visibleDays.flatMap((d) => geoByDay.get(d) ?? []);

  const center: L.LatLngExpression =
    visibleGeo.length > 0
      ? [
          visibleGeo.reduce((s, a) => s + a.lat, 0) / visibleGeo.length,
          visibleGeo.reduce((s, a) => s + a.lng, 0) / visibleGeo.length,
        ]
      : [16.047079, 108.20623];

  const fitPoints: [number, number][] = [
    ...visibleGeo.map((a): [number, number] => [a.lat, a.lng]),
    ...(searchResult
      ? [[searchResult.lat, searchResult.lng] as [number, number]]
      : []),
  ];

  const searchDistances =
    searchResult && allGeo.length > 0
      ? allGeo
          .map((a) => ({
            activity: a,
            km: haversineKm(searchResult.lat, searchResult.lng, a.lat, a.lng),
          }))
          .sort((x, y) => x.km - y.km)
      : [];

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    try {
      const result = await geocodeLocation(q);
      if (result) {
        setSearchResult({ lat: result.lat, lng: result.lng, name: q });
        setFitTrigger((n) => n + 1);
        // Reset cached POI so they reload around the new search location
        setPoiItems([]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleTogglePOI = async (checked: boolean) => {
    setShowPOI(checked);
    if (checked && poiItems.length === 0) {
      // Prefer search result location; fall back to activities centroid
      const center = searchResult
        ? { lat: searchResult.lat, lng: searchResult.lng }
        : allGeo.length > 0
          ? {
              lat: allGeo.reduce((s, a) => s + a.lat, 0) / allGeo.length,
              lng: allGeo.reduce((s, a) => s + a.lng, 0) / allGeo.length,
            }
          : null;
      if (!center) return;
      setIsLoadingPOI(true);
      try {
        const items = await fetchPOI(center.lat, center.lng);
        setPoiItems(items);
      } catch {
        /* non-critical */
      } finally {
        setIsLoadingPOI(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Search bar ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-secondary-700/30 bg-surface-card p-3">
        <p className="mb-2 font-medium text-on-surface text-sm">
          🔍 Tìm kiếm địa điểm
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Nhập tên địa điểm cần tìm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="shrink-0 bg-primary-500 text-white"
          >
            {isSearching ? "Đang tìm..." : "Tìm"}
          </Button>
          {searchResult && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSearchResult(null)}
              className="shrink-0 text-on-surface-variant"
            >
              Xoá
            </Button>
          )}
        </div>
        {searchResult && (
          <p className="mt-1.5 text-on-surface-variant text-xs">
            📍 Đang hiển thị:{" "}
            <span className="font-medium text-on-surface">
              {searchResult.name}
            </span>
          </p>
        )}
      </div>

      {/* ── Day filters + POI toggle ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={selectedDay === null ? "default" : "outline"}
          onClick={() => setSelectedDay(null)}
        >
          Tất cả
        </Button>
        {days.map((day) => {
          const hasGeo = geoByDay.has(day.dayNumber);
          return (
            <Button
              key={day.dayNumber}
              size="sm"
              variant={selectedDay === day.dayNumber ? "default" : "outline"}
              onClick={() =>
                setSelectedDay(
                  selectedDay === day.dayNumber ? null : day.dayNumber
                )
              }
              disabled={!hasGeo}
            >
              Ngày {day.dayNumber}
              {hasGeo && (
                <span
                  className="ml-1.5 inline-block h-2 w-2 rounded-full"
                  style={{ background: getDayColor(day.dayNumber - 1) }}
                />
              )}
            </Button>
          );
        })}
        <label className="ml-auto flex cursor-pointer select-none items-center gap-1.5 text-on-surface-variant text-sm">
          <input
            type="checkbox"
            checked={showPOI}
            onChange={(e) => handleTogglePOI(e.target.checked)}
            className="accent-primary-500"
            disabled={allGeo.length === 0 && !searchResult}
          />
          {isLoadingPOI ? "Đang tải POI..." : "Hiện địa điểm lân cận"}
        </label>
      </div>

      {allGeo.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-300 border-dashed py-16 text-neutral-500">
          <p className="text-sm">Chưa có địa điểm nào được xác định toạ độ.</p>
          <p className="mt-1 text-xs">
            Điền thông tin địa điểm khi thêm hoạt động để hiển thị bản đồ.
          </p>
        </div>
      ) : (
        <>
          <MapContainer
            center={center}
            zoom={12}
            scrollWheelZoom={true}
            zoomControl={true}
            style={{ height: 480, borderRadius: 12, zIndex: 0 }}
            className="w-full shadow-sm"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <ZoomTracker onZoomChange={setZoom} />
            <FitBoundsEffect points={fitPoints} trigger={fitTrigger} />

            {visibleDays.map((dayNum) => {
              const acts = geoByDay.get(dayNum) ?? [];
              const color = getDayColor(dayNum - 1);
              return (
                <div key={dayNum}>
                  {acts.map((a, idx) => (
                    <DraggableMarker
                      key={a.id}
                      activity={a}
                      color={color}
                      label={String(idx + 1)}
                      dayNumber={dayNum}
                      canEdit={canEdit}
                      onUpdateActivity={onUpdateActivity}
                    />
                  ))}
                  {acts.length > 1 && (
                    <>
                      <Polyline
                        positions={acts.map((a) => [a.lat, a.lng])}
                        pathOptions={{ color, weight: 2, dashArray: "6 4" }}
                      >
                        <Popup>Ngày {dayNum}</Popup>
                      </Polyline>
                      {acts.slice(0, -1).map((a, idx) => {
                        const next = acts[idx + 1];
                        const dist = haversineKm(
                          a.lat,
                          a.lng,
                          next.lat,
                          next.lng
                        );
                        return (
                          <DistanceLabel
                            key={`${a.id}-${next.id}`}
                            p1={[a.lat, a.lng]}
                            p2={[next.lat, next.lng]}
                            distKm={dist}
                          />
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })}

            {searchResult && (
              <SearchMarker
                lat={searchResult.lat}
                lng={searchResult.lng}
                name={searchResult.name}
              />
            )}
            {/* Show POI whenever toggled on — no zoom gate to avoid invisible POI issue */}
            {showPOI && <POILayer items={poiItems} />}
          </MapContainer>

          {/* ── Distance from search location ───────────────────── */}
          {searchDistances.length > 0 && (
            <div className="rounded-xl border border-secondary-700/30 bg-surface-card p-3">
              <p className="mb-2 font-medium text-on-surface text-sm">
                📏 Khoảng cách từ &quot;{searchResult?.name}&quot; đến các điểm
                lịch trình
              </p>
              <div className="space-y-1.5">
                {searchDistances.map(({ activity, km }) => {
                  const dayNum = days.find(
                    (d) => d.date === activity.date
                  )?.dayNumber;
                  const warn = km > 10;
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-1.5 text-on-surface">
                        {dayNum !== undefined && (
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ background: getDayColor(dayNum - 1) }}
                          />
                        )}
                        {activity.title}
                      </span>
                      <span
                        className={
                          warn
                            ? "font-semibold text-warning-500"
                            : "text-on-surface-variant"
                        }
                      >
                        {warn && "⚠️ "}
                        {km.toFixed(1)} km
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showPOI && poiItems.length > 0 && zoom < 13 && (
            <p className="text-center text-on-surface-variant/60 text-xs">
              Zoom vào bản đồ để thấy rõ hơn các địa điểm lân cận
            </p>
          )}

          {/* ── Distance table (consecutive activities) ─────────── */}
          <div className="overflow-x-auto rounded-sm border border-neutral-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-neutral-200 border-b bg-surface-card">
                  <th className="px-4 py-2 text-left font-medium text-white">
                    Ngày
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-white">
                    Từ
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-white">
                    Đến
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-white">
                    Khoảng cách
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleDays.flatMap((dayNum) => {
                  const acts = geoByDay.get(dayNum) ?? [];
                  if (acts.length < 2) return [];
                  return acts.slice(0, -1).map((a, idx) => {
                    const next = acts[idx + 1];
                    const dist = haversineKm(a.lat, a.lng, next.lat, next.lng);
                    const warn = dist > 10;
                    return (
                      <tr
                        key={`${a.id}-${next.id}`}
                        className="border-neutral-100 border-b last:border-0"
                      >
                        <td className="px-4 py-2 text-white">
                          <span
                            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: getDayColor(dayNum - 1) }}
                          />
                          {dayNum}
                        </td>
                        <td className="max-w-40 truncate px-4 py-2 text-white">
                          {a.title}
                        </td>
                        <td className="max-w-40 truncate px-4 py-2 text-white">
                          {next.title}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={
                              warn
                                ? "font-medium text-warning-600"
                                : "text-white"
                            }
                          >
                            {warn && <span className="mr-1">⚠️</span>}
                            {dist.toFixed(1)} km
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {days
              .filter((d) => geoByDay.has(d.dayNumber))
              .map((d) => (
                <Badge
                  key={d.dayNumber}
                  variant="outline"
                  className="gap-1.5 text-xs"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: getDayColor(d.dayNumber - 1) }}
                  />
                  Ngày {d.dayNumber} · {formatDate(d.date)}
                </Badge>
              ))}
          </div>
        </>
      )}
    </div>
  );
};
