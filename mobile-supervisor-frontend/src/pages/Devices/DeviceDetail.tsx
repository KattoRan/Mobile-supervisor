// src/pages/Devices/DeviceDetail.tsx
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import io from "socket.io-client";
import deviceService from "../../services/device";
import btsService from "../../services/bts";
import DateRangeExportCSV from "../../components/exportCsv/exportCsv";

// --- CẤU HÌNH ICON LEAFLET ---
import iconMarker from "leaflet/dist/images/marker-icon.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import cellTowerIcon from "../../assets/cell-tower.png";
import { FaUser } from "react-icons/fa";
import { MdSignalCellular4Bar } from "react-icons/md";

// --- HẰNG SỐ CẤU HÌNH ---
const UPDATE_THROTTLE = 1000; // Tần suất update UI (ms)

// CẤU HÌNH BỘ LỌC GPS
const MIN_MOVE_THRESHOLD = 20; // Nếu di chuyển < 30m thì coi như đứng yên
const BUFFER_SIZE = 5; // Số lượng điểm dùng để tính trung bình cộng (làm mượt)
const MAX_SPEED_KPH = 150; // Nếu tốc độ > 150km/h thì coi là lỗi nhảy cóc

// Fix lỗi icon mặc định
const defaultIcon = L.icon({
  iconRetinaUrl: iconRetina,
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

// Các loại Icon tùy chỉnh
const btsIcon = new L.Icon({
  iconUrl: cellTowerIcon,
  iconSize: [60, 60],
  iconAnchor: [20, 40],
});

const neighborIcon = new L.Icon({
  iconUrl: cellTowerIcon,
  iconSize: [50, 50],
  iconAnchor: [15, 30],
  className: "neighbor-marker",
});

const generalBtsIcon = new L.Icon({
  iconUrl: cellTowerIcon,
  iconSize: [45, 45],
  iconAnchor: [12, 25],
  className: "general-bts-marker",
});

// --- HÀM TÍNH KHOẢNG CÁCH (Haversine Formula) ---
const getDistanceFromLatLonInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371; // Bán kính trái đất km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d * 1000; // Trả về mét
};

interface DeviceDetailProps {
  deviceId: string;
  onBack: () => void;
}

// Component phụ để load BTS khi di chuyển map
const BtsLoader: React.FC<{
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}> = ({ onBoundsChange }) => {
  const map = useMap();
  useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds()),
  });
  useEffect(() => {
    onBoundsChange(map.getBounds());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

const DeviceDetail: React.FC<DeviceDetailProps> = ({ deviceId, onBack }) => {
  // --- STATE ---
  const [info, setInfo] = useState<any>(null);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [cellInfo, setCellInfo] = useState<any>(null);

  const [btsInfo, setBtsInfo] = useState<any>(null);
  const [neighborInfo, setNeighborInfo] = useState<any[]>([]);
  const [allBtsInView, setAllBtsInView] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingBts, setLoadingBts] = useState(false);

  // --- REFS ĐỂ XỬ LÝ LOGIC ---
  const pendingUpdate = useRef<any>(null);
  const lastUpdateTime = useRef<number>(0);
  const updateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs cho thuật toán lọc nhiễu
  const lastValidPos = useRef<[number, number] | null>(null);
  const positionBuffer = useRef<[number, number][]>([]);

  // --- API CALL ---
  const fetchDetail = async () => {
    try {
      setLoading(true);
      const result = await deviceService.getById(deviceId);
      setInfo(result);

      if (result.current_location) {
        const point: [number, number] = [
          Number(result.current_location.latitude),
          Number(result.current_location.longitude),
        ];
        setCurrentPos(point);

        // Khởi tạo trạng thái lọc
        lastValidPos.current = point;
        positionBuffer.current = [point];
      }

      if (result.connected_station) {
        setBtsInfo({
          ...result.connected_station,
          lat: Number(result.connected_station.lat),
          lon: Number(result.connected_station.lon),
        });
      }

      if (result.neighbor_stations && Array.isArray(result.neighbor_stations)) {
        const neighbors = result.neighbor_stations.map((s: any) => ({
          ...s,
          lat: Number(s.lat),
          lon: Number(s.lon),
        }));
        setNeighborInfo(neighbors);
      }

      if (result.current_cell) {
        setCellInfo(result.current_cell);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBtsInViewport = async (bounds: L.LatLngBounds) => {
    try {
      setLoadingBts(true);
      const params = {
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLon: bounds.getWest(),
        maxLon: bounds.getEast(),
      };
      const btsData = await btsService.getByBoundingBox(params);
      const formattedBts = (btsData || []).map((bts: any) => ({
        ...bts,
        lat: Number(bts.lat || bts.latitude),
        lon: Number(bts.lon || bts.longitude),
      }));
      setAllBtsInView(formattedBts);
    } catch (error) {
      console.error("Lỗi tải BTS:", error);
    } finally {
      setLoadingBts(false);
    }
  };

  useEffect(() => {
    if (deviceId) fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  // --- XỬ LÝ BATCH UPDATE VỚI THUẬT TOÁN LỌC ---
  const processBatchUpdate = useCallback(() => {
    if (!pendingUpdate.current) return;

    const payload = pendingUpdate.current;
    pendingUpdate.current = null;

    const rawLat = Number(payload.lat);
    const rawLon = Number(payload.lon);

    // 1. Lọc theo độ chính xác của thiết bị (nếu có)
    if (payload.accuracy && payload.accuracy > 100) {
      console.log("Bỏ qua do độ chính xác kém:", payload.accuracy);
      return;
    }

    // 2. Thuật toán Moving Average (Trung bình trượt)
    positionBuffer.current.push([rawLat, rawLon]);
    if (positionBuffer.current.length > BUFFER_SIZE) {
      positionBuffer.current.shift();
    }

    const avgLat =
      positionBuffer.current.reduce((a, b) => a + b[0], 0) /
      positionBuffer.current.length;
    const avgLon =
      positionBuffer.current.reduce((a, b) => a + b[1], 0) /
      positionBuffer.current.length;

    // 3. Logic kiểm tra khoảng cách và tốc độ
    let isValidMove = true;

    if (lastValidPos.current) {
      const dist = getDistanceFromLatLonInMeters(
        lastValidPos.current[0],
        lastValidPos.current[1],
        avgLat,
        avgLon
      );

      // Điều kiện A: Nếu di chuyển < 30m -> coi như nhiễu
      if (dist < MIN_MOVE_THRESHOLD) {
        isValidMove = false;
        console.log(`Bỏ qua do di chuyển nhỏ: ${dist.toFixed(1)}m`);
      }
      // Điều kiện B: Nếu di chuyển quá nhanh (teleport)
      else {
        const timeDiff = (Date.now() - lastUpdateTime.current) / 1000;
        if (timeDiff > 0) {
          const speedKph = (dist / timeDiff) * 3.6;
          if (speedKph > MAX_SPEED_KPH) {
            console.log(`Bỏ qua do tốc độ ảo: ${speedKph.toFixed(0)} km/h`);
            isValidMove = false;
          }
        }
      }
    }

    // --- CẬP NHẬT STATE ---

    // 1. LUÔN cập nhật thông tin Cell/Signal realtime (dù vị trí có thay đổi hay không)
    if (payload.current_cell || payload.rssi || payload.signal_dbm) {
      setCellInfo((prev: any) => ({
        ...prev,
        ...(payload.current_cell || {}),
        rssi: payload.rssi || payload.current_cell?.rssi || prev?.rssi,
        signal_dbm:
          payload.signal_dbm ||
          payload.current_cell?.signal_dbm ||
          prev?.signal_dbm,
      }));
    }

    // 2. LUÔN cập nhật BTS info realtime (serving cell mới)
    if (payload.connected_station) {
      const newBtsInfo = {
        ...payload.connected_station,
        lat: Number(payload.connected_station.lat),
        lon: Number(payload.connected_station.lon),
      };
      setBtsInfo(newBtsInfo);
      console.log("Cập nhật Serving BTS mới:", newBtsInfo.cid);
    }

    // 3. LUÔN cập nhật neighbor stations realtime
    if (payload.neighbor_stations && Array.isArray(payload.neighbor_stations)) {
      const neighbors = payload.neighbor_stations.map((s: any) => ({
        ...s,
        lat: Number(s.lat),
        lon: Number(s.lon),
      }));
      setNeighborInfo(neighbors);
      console.log("Cập nhật Neighbors:", neighbors.length, "trạm");
    }

    // 4. Nếu vị trí HỢP LỆ -> Cập nhật vị trí thiết bị trên map
    if (isValidMove) {
      const validPoint: [number, number] = [avgLat, avgLon];
      lastValidPos.current = validPoint;
      setCurrentPos(validPoint);

      console.log(
        `✓ Cập nhật vị trí mới: ${avgLat.toFixed(6)}, ${avgLon.toFixed(6)}`
      );

      // Cập nhật thông tin device info
      if (payload.device) {
        setInfo((prev: any) => ({
          ...prev,
          ...payload.device,
          current_location: { latitude: avgLat, longitude: avgLon },
        }));
      }
    } else {
      console.log("✗ Giữ nguyên vị trí cũ (movement không hợp lệ)");
    }

    lastUpdateTime.current = Date.now();
  }, []);

  // --- SOCKET LISTENER ---
  useEffect(() => {
    if (!deviceId) return;
    const socket = io("http://13.236.208.62:3000");

    socket.on("device_moved", (payload: any) => {
      if (payload.deviceId === deviceId) {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTime.current;

        pendingUpdate.current = payload;

        // Cơ chế Throttle
        if (timeSinceLastUpdate >= UPDATE_THROTTLE) {
          if (updateTimeout.current) clearTimeout(updateTimeout.current);
          processBatchUpdate();
        } else {
          if (updateTimeout.current) clearTimeout(updateTimeout.current);
          updateTimeout.current = setTimeout(() => {
            processBatchUpdate();
          }, UPDATE_THROTTLE - timeSinceLastUpdate);
        }
      }
    });

    return () => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      socket.disconnect();
    };
  }, [deviceId, processBatchUpdate]);

  // Memo: Lọc BTS hiển thị
  const filteredGeneralBts = useMemo(() => {
    const servingCid = btsInfo?.cid;
    const neighborCids = new Set(neighborInfo.map((n) => n.cid));
    return allBtsInView.filter(
      (bts) => bts.cid !== servingCid && !neighborCids.has(bts.cid)
    );
  }, [allBtsInView, btsInfo, neighborInfo]);

  if (loading) return <div className="p-4">Đang tải dữ liệu...</div>;
  if (!info)
    return (
      <div className="p-4">
        Không tìm thấy thiết bị. <button onClick={onBack}>Quay lại</button>
      </div>
    );

  return (
    <div style={{ padding: "20px", background: "#fff", borderRadius: "8px" }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "8px 16px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            background: "#f3f4f6",
          }}
        >
          ← Quay lại danh sách
        </button>
        <button
          onClick={fetchDetail}
          style={{
            padding: "8px 16px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Làm mới
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <DateRangeExportCSV deviceId={deviceId} deviceModel={info.model} />
      </div>

      {/* INFO PANELS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            padding: "15px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FaUser size={16} />
            <h3>Thông tin chủ sở hữu</h3>
          </div>
          <div>
            <div>
              <strong>Họ tên:</strong> {info.user?.full_name}
            </div>
            <div>
              <strong>CCCD:</strong> {info.user?.citizen_id}
            </div>
            <div>
              <strong>Địa chỉ:</strong> {info.user?.address}
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "15px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <MdSignalCellular4Bar size={18} />
            <h3>Trạng thái kết nối</h3>
          </div>
          <div>
            <div>
              <strong>Model:</strong> {info.model}
            </div>
            <div style={{ color: "#2563eb" }}>
              <strong>Serving BTS:</strong>{" "}
              {btsInfo?.address || "Chưa xác định"} (CID: {btsInfo?.cid})
            </div>
            <div>
              <strong>Neighbors:</strong> {neighborInfo.length} trạm
            </div>
            <div>
              <strong>Signal:</strong>{" "}
              {cellInfo?.signal_dbm || cellInfo?.rssi || "N/A"} dBm
            </div>
          </div>
        </div>
      </div>

      {/* MAP CONTAINER */}
      <div
        style={{
          height: "500px",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #ddd",
        }}
      >
        {currentPos ? (
          <MapContainer
            center={currentPos}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <BtsLoader onBoundsChange={loadBtsInViewport} />

            {/* Marker Thiết bị */}
            <Marker position={currentPos} zIndexOffset={1000}>
              <Popup>
                <b>{info.model}</b>
                <br />
                {new Date().toLocaleTimeString()}
              </Popup>
            </Marker>

            {/* Serving BTS */}
            {btsInfo && btsInfo.lat && (
              <>
                <Marker
                  position={[btsInfo.lat, btsInfo.lon]}
                  icon={btsIcon}
                  zIndexOffset={500}
                >
                  <Popup>
                    <b style={{ color: "blue" }}>Serving Cell</b>
                    <br />
                    {btsInfo.address}
                    <br />
                    CID: {btsInfo.cid}
                  </Popup>
                </Marker>
                <Circle
                  center={[btsInfo.lat, btsInfo.lon]}
                  radius={btsInfo.range || 500}
                  pathOptions={{ color: "red", fillOpacity: 0.05, weight: 1 }}
                />
                <Polyline
                  positions={[currentPos, [btsInfo.lat, btsInfo.lon]]}
                  pathOptions={{ color: "red", dashArray: "10, 10", weight: 2 }}
                />
              </>
            )}

            {/* Neighbor BTS */}
            {neighborInfo.map((n, i) => (
              <Marker
                key={`n-${i}`}
                position={[n.lat, n.lon]}
                icon={neighborIcon}
                opacity={0.7}
              >
                <Popup>
                  <b>Neighbor</b>
                  <br />
                  {n.address}
                  <br />
                  CID: {n.cid}
                </Popup>
              </Marker>
            ))}

            {/* General BTS */}
            {filteredGeneralBts.map((bts, i) => (
              <Marker
                key={`g-${i}`}
                position={[bts.lat, bts.lon]}
                icon={generalBtsIcon}
                opacity={0.5}
              >
                <Popup>
                  <b>BTS</b>
                  <br />
                  {bts.address}
                  <br />
                  CID: {bts.cid}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div
            style={{
              display: "flex",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              background: "#f9fafb",
            }}
          >
            <p>Chưa có dữ liệu vị trí GPS.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceDetail;
