import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import io from "socket.io-client";
import "leaflet/dist/leaflet.css";

// --- Cấu hình icon mặc định cho Leaflet ---
import iconUrl from "leaflet/dist/images/marker-icon.png";
import icon2x from "leaflet/dist/images/marker-icon-2x.png";
import shadow from "leaflet/dist/images/marker-shadow.png";

L.Marker.prototype.options.icon = L.icon({
  iconUrl,
  iconRetinaUrl: icon2x,
  shadowUrl: shadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// --- Định nghĩa kiểu dữ liệu ---
type P = {
  lat: number;
  lng: number;
  ts: number;
  userName?: string;
  phoneNumber?: string;
};
type DeviceMap = Record<string, P>;

// --- COMPONENT MOVINGMARKER - PHIÊN BẢN SỬA LỖI ---
const ANIMATION_DURATION = 1900; // ms, ngắn hơn tần suất cập nhật dữ liệu (2000ms)

function MovingMarker({
  point,
  children,
}: {
  point: { lat: number; lng: number };
  children?: React.ReactNode;
}) {
  // State để lưu vị trí "đang hiển thị" của marker trên bản đồ
  const [currentPosition, setCurrentPosition] = useState([
    point.lat,
    point.lng,
  ]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Hủy animation cũ nếu có vị trí mới đến
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const startPosition = L.latLng(currentPosition[0], currentPosition[1]);
    const endPosition = L.latLng(point.lat, point.lng);
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / ANIMATION_DURATION, 1);

      // Nội suy để tìm vị trí trung gian
      const lat =
        startPosition.lat + (endPosition.lat - startPosition.lat) * progress;
      const lng =
        startPosition.lng + (endPosition.lng - startPosition.lng) * progress;

      // Cập nhật state để React vẽ lại Marker ở vị trí mới
      setCurrentPosition([lat, lng]);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Đảm bảo marker dừng chính xác ở vị trí cuối cùng
        setCurrentPosition([endPosition.lat, endPosition.lng]);
      }
    };

    // Bắt đầu animation
    animationFrameRef.current = requestAnimationFrame(animate);

    // Hàm dọn dẹp
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [point.lat, point.lng]); // Chỉ chạy lại effect khi tọa độ mới được truyền vào

  // Component Marker của react-leaflet sẽ tự động cập nhật khi state `currentPosition` thay đổi
  return (
    <Marker position={currentPosition as L.LatLngExpression}>{children}</Marker>
  );
}

// --- Component FollowDevice (giữ nguyên) ---
function FollowDevice({
  point,
  enabled = true,
  edgePadding = 0.2,
  panEveryMs = 2500,
}: {
  point?: { lat: number; lng: number };
  enabled?: boolean;
  edgePadding?: number;
  panEveryMs?: number;
}) {
  const map = useMap();
  const lastPan = useRef(0);

  useEffect(() => {
    if (!enabled || !point) return;
    const now = Date.now();
    if (now - lastPan.current < panEveryMs) return;
    const pos = L.latLng(point.lat, point.lng);
    const bounds = map.getBounds().pad(-edgePadding);
    if (!bounds.contains(pos)) {
      map.panTo(pos, { animate: true, duration: 0.6 });
      lastPan.current = now;
    }
  }, [enabled, point?.lat, point?.lng, map, edgePadding, panEveryMs]);

  return null;
}

// --- Component chính RealtimeMap (giữ nguyên logic) ---
export default function RealtimeMap() {
  const [devices, setDevices] = useState<DeviceMap>({});
  const [focusId, setFocusId] = useState<string | null>(null);

  const center = useMemo<[number, number]>(() => {
    if (focusId && devices[focusId])
      return [devices[focusId].lat, devices[focusId].lng];
    return [10.776889, 106.700806];
  }, [devices, focusId]);

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";
    const socket = io(`${base}/realtime`, { transports: ["websocket"] });

    const APPLY_MS = 2000;
    let pending: Record<string, P> = {};

    socket.on("snapshot", (list: any[]) => {
      const map: DeviceMap = {};
      list.forEach((d: any) => {
        map[d.deviceId] = {
          lat: d.lat,
          lng: d.lng,
          ts: d.ts,
          userName: d.userName,
          phoneNumber: d.phoneNumber,
        };
      });
      setDevices(map);
      if (!focusId && list[0]) setFocusId(list[0].deviceId);
    });

    socket.on("position", (msg: any) => {
      pending[msg.deviceId] = {
        lat: msg.lat,
        lng: msg.lng,
        ts: msg.ts,
        userName: msg.userName,
        phoneNumber: msg.phoneNumber,
      };
    });

    const flushTimer = setInterval(() => {
      if (!Object.keys(pending).length) return;
      setDevices((prev) => ({ ...prev, ...pending }));
      pending = {};
    }, APPLY_MS);

    return () => {
      clearInterval(flushTimer);
      socket.off("snapshot");
      socket.off("position");
      socket.disconnect();
    };
  }, [focusId]);

  const focusPoint =
    focusId && devices[focusId]
      ? { lat: devices[focusId].lat, lng: devices[focusId].lng }
      : undefined;

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1000,
          background: "white",
          padding: 8,
          borderRadius: 4,
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        }}
      >
        <select
          value={focusId ?? ""}
          onChange={(e) => setFocusId(e.target.value)}
        >
          <option value="" disabled>
            Chọn thiết bị
          </option>
          {Object.keys(devices).map((id) => (
            <option key={id} value={id}>
              {devices[id].userName || id}
            </option>
          ))}
        </select>
      </div>

      <MapContainer
        center={center}
        zoom={15}
        style={{ height: "100vh", width: "100%" }}
      >
        <FollowDevice point={focusPoint} enabled={!!focusId} />
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {Object.entries(devices).map(([id, p]) => (
          <MovingMarker key={id} point={{ lat: p.lat, lng: p.lng }}>
            <Popup>
              <b>{p.userName || id}</b>
              <br />
              Lat: {p.lat.toFixed(6)}
              <br />
              Lng: {p.lng.toFixed(6)}
              <br />
              {p.phoneNumber && (
                <>
                  Phone: {p.phoneNumber}
                  <br />
                </>
              )}
              Cập nhật: {new Date(p.ts).toLocaleString()}
            </Popup>
          </MovingMarker>
        ))}
      </MapContainer>
    </div>
  );
}
