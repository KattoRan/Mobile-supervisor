// src/pages/Devices/DeviceDetail.tsx
import React, { useEffect, useState } from "react";
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

// --- CONFIG ICON LEAFLET ---
import iconMarker from "leaflet/dist/images/marker-icon.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconRetinaUrl: iconRetina,
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

// 1. Icon cho Serving Cell (Trạm chính - To rõ)
const btsIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3256/3256778.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// 2. Icon cho Neighbor Cell (Trạm hàng xóm - Nhỏ hơn, mờ hơn)
const neighborIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3256/3256778.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  className: "neighbor-marker",
});

// 3. Icon cho BTS trong viewport (Trạm phổ thông)
const generalBtsIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3256/3256778.png",
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  className: "general-bts-marker",
});

interface DeviceDetailProps {
  deviceId: string;
  onBack: () => void;
}

// Component để xử lý sự kiện bản đồ và load BTS
const BtsLoader: React.FC<{
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}> = ({ onBoundsChange }) => {
  const map = useMap();

  // Load BTS khi bản đồ di chuyển hoặc zoom
  useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    },
    zoomend: () => {
      onBoundsChange(map.getBounds());
    },
  });

  // Load BTS lần đầu
  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, []);

  return null;
};

const DeviceDetail: React.FC<DeviceDetailProps> = ({ deviceId, onBack }) => {
  const [info, setInfo] = useState<any>(null);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [pathHistory, setPathHistory] = useState<[number, number][]>([]);

  // State cho trạm chính (Serving)
  const [btsInfo, setBtsInfo] = useState<any>(null);
  // State cho danh sách trạm hàng xóm (Neighbors)
  const [neighborInfo, setNeighborInfo] = useState<any[]>([]);
  // State cho tất cả BTS trong viewport
  const [allBtsInView, setAllBtsInView] = useState<any[]>([]);

  const [cellInfo, setCellInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBts, setLoadingBts] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const result = await deviceService.getById(deviceId);
      setInfo(result);

      // Xử lý vị trí
      if (result.current_location) {
        const point: [number, number] = [
          Number(result.current_location.latitude),
          Number(result.current_location.longitude),
        ];
        setCurrentPos(point);
        setPathHistory([point]);
      }

      // Xử lý Serving Cell (Trạm chính)
      if (result.connected_station) {
        setBtsInfo({
          ...result.connected_station,
          lat: Number(result.connected_station.lat),
          lon: Number(result.connected_station.lon),
        });
      }

      // Xử lý Neighbor Cells (Danh sách trạm phụ)
      if (result.neighbor_stations && Array.isArray(result.neighbor_stations)) {
        const neighbors = result.neighbor_stations.map((s: any) => ({
          ...s,
          lat: Number(s.lat),
          lon: Number(s.lon),
        }));
        setNeighborInfo(neighbors);
      }

      // Xử lý thông tin sóng
      if (result.current_cell) {
        setCellInfo(result.current_cell);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  // Hàm load BTS trong viewport
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

      // Chuyển đổi dữ liệu BTS
      const formattedBts = (btsData || []).map((bts: any) => ({
        ...bts,
        lat: Number(bts.lat || bts.latitude),
        lon: Number(bts.lon || bts.longitude),
      }));

      setAllBtsInView(formattedBts);
    } catch (error) {
      console.error("Lỗi load BTS:", error);
    } finally {
      setLoadingBts(false);
    }
  };

  useEffect(() => {
    if (deviceId) fetchDetail();
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    const socket = io("http://13.236.208.62:3000");

    socket.on("device_moved", (payload: any) => {
      if (payload.deviceId === deviceId) {
        const newPoint: [number, number] = [
          Number(payload.lat),
          Number(payload.lon),
        ];
        setCurrentPos(newPoint);
        setPathHistory((prev) => [...prev, newPoint]);

        if (payload.rssi) {
          setCellInfo((prev: any) => ({ ...prev, rssi: payload.rssi }));
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [deviceId]);

  // Lọc ra các BTS không phải serving và neighbor
  const getGeneralBts = () => {
    const servingCid = btsInfo?.cid;
    const neighborCids = neighborInfo.map((n) => n.cid);

    return allBtsInView.filter(
      (bts) => bts.cid !== servingCid && !neighborCids.includes(bts.cid)
    );
  };

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
            cursor: "pointer",
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
            cursor: "pointer",
          }}
        >
          Làm mới (Reload BTS)
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
          <h3 style={{ margin: "0 0 10px", color: "#374151" }}>
            👤 Thông tin chủ sở hữu
          </h3>
          <div style={{ lineHeight: "1.6" }}>
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
          <h3 style={{ margin: "0 0 10px", color: "#374151" }}>
            📱 Trạng thái kết nối
          </h3>
          <div style={{ lineHeight: "1.6" }}>
            <div>
              <strong>Model:</strong> {info.model}
            </div>
            <div>
              <strong>SĐT:</strong> {info.phone_number}
            </div>
            <div style={{ color: "#2563eb" }}>
              <strong>Serving BTS:</strong>{" "}
              {btsInfo?.address || "Chưa xác định"}
              {btsInfo && ` (CID: ${btsInfo.cid})`}
            </div>
            <div>
              <strong>Neighbors:</strong> {neighborInfo.length} trạm xung quanh
            </div>
            <div>
              <strong>BTS trong vùng:</strong> {allBtsInView.length} trạm
              {loadingBts && " (đang tải...)"}
            </div>
            <div>
              <strong>Signal:</strong>{" "}
              {cellInfo?.signal_dbm || cellInfo?.rssi || "N/A"} dBm
            </div>
          </div>
        </div>
      </div>

      {/* MAP */}
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

            {/* Component load BTS khi viewport thay đổi */}
            <BtsLoader onBoundsChange={loadBtsInViewport} />

            {/* 1. Đường đi thiết bị */}
            <Polyline
              positions={pathHistory}
              color="blue"
              weight={4}
              opacity={0.6}
            />

            {/* 2. Marker Thiết bị */}
            <Marker position={currentPos} zIndexOffset={1000}>
              <Popup>
                <b>{info.model}</b> <br />
                Đang hoạt động <br />
                {new Date().toLocaleTimeString()}
              </Popup>
            </Marker>

            {/* 3. Serving Cell (CÓ DÂY NỐI, Marker To) */}
            {btsInfo && (
              <>
                <Marker
                  position={[btsInfo.lat, btsInfo.lon]}
                  icon={btsIcon}
                  zIndexOffset={500}
                >
                  <Popup>
                    <b style={{ color: "blue" }}>Serving Cell (Trạm chính)</b>
                    <br />
                    {btsInfo.address}
                    <br />
                    CID: {btsInfo.cid}
                  </Popup>
                </Marker>

                {/* Vùng phủ sóng */}
                <Circle
                  center={[btsInfo.lat, btsInfo.lon]}
                  radius={btsInfo.range || 500}
                  pathOptions={{ color: "red", fillOpacity: 0.05, weight: 1 }}
                />

                {/* Dây nối: Thiết bị -> BTS */}
                <Polyline
                  positions={[currentPos, [btsInfo.lat, btsInfo.lon]]}
                  pathOptions={{
                    color: "red",
                    dashArray: "10, 10",
                    weight: 2,
                    opacity: 0.8,
                  }}
                />
              </>
            )}

            {/* 4. Neighbor Cells (KHÔNG CÓ DÂY NỐI, Marker Nhỏ) */}
            {neighborInfo.map((neighbor, idx) => (
              <Marker
                key={`neighbor-${idx}`}
                position={[neighbor.lat, neighbor.lon]}
                icon={neighborIcon}
                opacity={0.7}
              >
                <Popup>
                  <b>Neighbor Cell (Hàng xóm)</b>
                  <br />
                  {neighbor.address}
                  <br />
                  CID: {neighbor.cid}
                </Popup>
              </Marker>
            ))}

            {/* 5. Tất cả BTS khác trong viewport */}
            {getGeneralBts().map((bts, idx) => (
              <React.Fragment key={`general-bts-${idx}`}>
                <Marker
                  position={[bts.lat, bts.lon]}
                  icon={generalBtsIcon}
                  opacity={0.5}
                >
                  <Popup>
                    <b>BTS Station</b>
                    <br />
                    {bts.address || bts.name || "Không có địa chỉ"}
                    <br />
                    CID: {bts.cid}
                    {bts.range && (
                      <>
                        <br />
                        Range: {bts.range}m
                      </>
                    )}
                  </Popup>
                </Marker>

                {/* Vùng phủ sóng cho BTS phổ thông (tùy chọn) */}
                {bts.range && (
                  <Circle
                    center={[bts.lat, bts.lon]}
                    radius={bts.range}
                    pathOptions={{
                      color: "gray",
                      fillOpacity: 0.02,
                      weight: 0.5,
                      opacity: 0.3,
                    }}
                  />
                )}
              </React.Fragment>
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
