// src/pages/Devices/DeviceDetail.tsx
import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import deviceService from "../../services/device.ts";

// --- CONFIG ICON LEAFLET ---
// Fix lỗi icon mặc định không hiện trong React Leaflet
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

const btsIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3256/3256778.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// --- TYPES (Định nghĩa ngay tại đây hoặc tách ra file riêng) ---
interface DeviceDetailProps {
  deviceId: string;
  onBack: () => void; // Hàm để quay lại bảng danh sách
}

const DeviceDetail: React.FC<DeviceDetailProps> = ({ deviceId, onBack }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const result = await deviceService.getById(deviceId);
      setData(result);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deviceId) fetchDetail();
  }, [deviceId]);

  if (loading) return <div className="p-4">Đang tải dữ liệu...</div>;
  if (!data)
    return (
      <div className="p-4">
        Không tìm thấy thiết bị. <button onClick={onBack}>Quay lại</button>
      </div>
    );

  // Xử lý dữ liệu bản đồ
  const pathPositions: [number, number][] =
    data.location_history?.map((loc: any) => [
      Number(loc.latitude),
      Number(loc.longitude),
    ]) || [];

  const currentPos =
    pathPositions.length > 0 ? pathPositions[pathPositions.length - 1] : null;

  const btsPos: [number, number] | null = data.connected_station
    ? [Number(data.connected_station.lat), Number(data.connected_station.lon)]
    : null;

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
          Làm mới
        </button>
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
        {/* User Info */}
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
              <strong>Họ tên:</strong> {data.user?.full_name}
            </div>
            <div>
              <strong>CCCD:</strong> {data.user?.citizen_id}
            </div>
            <div>
              <strong>Địa chỉ:</strong> {data.user?.address}
            </div>
          </div>
        </div>

        {/* Device Info */}
        <div
          style={{
            padding: "15px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        >
          <h3 style={{ margin: "0 0 10px", color: "#374151" }}>
            📱 Thiết bị & Kết nối
          </h3>
          <div style={{ lineHeight: "1.6" }}>
            <div>
              <strong>Model:</strong> {data.model}
            </div>
            <div>
              <strong>SĐT:</strong> {data.phone_number}
            </div>
            <div>
              <strong>Trạm BTS:</strong>{" "}
              {data.connected_station?.address || "Chưa xác định"}
            </div>
            <div>
              <strong>Sóng (RSSI):</strong>{" "}
              {data.current_cell?.signal_dbm || "N/A"} dBm
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
            zoom={14}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <Polyline
              positions={pathPositions}
              color="blue"
              weight={4}
              opacity={0.6}
            />

            <Marker position={currentPos}>
              <Popup>Vị trí thiết bị</Popup>
            </Marker>

            {btsPos && (
              <>
                <Marker position={btsPos} icon={btsIcon}>
                  <Popup>Trạm BTS: {data.connected_station?.address}</Popup>
                </Marker>
                <Polyline
                  positions={[currentPos, btsPos]}
                  pathOptions={{ color: "red", dashArray: "10, 10" }}
                />
                <Circle
                  center={btsPos}
                  radius={data.connected_station?.range || 500}
                  pathOptions={{ color: "red", fillOpacity: 0.1 }}
                />
              </>
            )}
          </MapContainer>
        ) : (
          <div
            style={{
              display: "flex",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Chưa có dữ liệu vị trí
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceDetail;
