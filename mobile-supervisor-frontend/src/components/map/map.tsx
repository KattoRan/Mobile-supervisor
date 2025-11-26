import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// --- CẤU HÌNH ICON ---

// Icon cho Trạm BTS (Hình tháp anten)
const btsIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3256/3256778.png", // Link ảnh icon trạm phát sóng
  iconSize: [40, 40], // Kích thước
  iconAnchor: [20, 40], // Điểm neo (giữa đáy)
  popupAnchor: [0, -40], // Điểm mở popup
});

// Icon cho Thiết bị (Hình điện thoại)
const deviceIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3437/3437364.png", // Link ảnh icon điện thoại
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

// --- INTERFACE DỮ LIỆU (Tương ứng với Prisma Model) ---

interface BtsStation {
  id: number;
  mcc: number;
  mnc: number;
  lac: number;
  cid: number;
  lat: number;
  lon: number;
  address: string;
  range: number;
}

interface DeviceLocation {
  id: string;
  lat: number;
  lon: number;
  timestamp: string;
  device_name: string;
  status: string;
  history: [number, number][]; // Mảng tọa độ để vẽ đường đi
}

const MapComponent = () => {
  const [stations, setStations] = useState<BtsStation[]>([]);
  const [devices, setDevices] = useState<DeviceLocation[]>([]);

  // --- GIẢ LẬP DỮ LIỆU (MOCK DATA) ---
  // Dữ liệu này khớp với file SQL seed trước đó
  useEffect(() => {
    // 1. Danh sách Trạm BTS
    const mockStations: BtsStation[] = [
      {
        id: 1,
        mcc: 452,
        mnc: 4,
        lac: 24001,
        cid: 101,
        lat: 21.020522,
        lon: 105.764585,
        address: "BTS Viettel - SVĐ Mỹ Đình",
        range: 1000,
      },
      {
        id: 2,
        mcc: 452,
        mnc: 4,
        lac: 24001,
        cid: 102,
        lat: 21.036982,
        lon: 105.782352,
        address: "BTS Viettel - Xuân Thủy",
        range: 800,
      },
      {
        id: 3,
        mcc: 452,
        mnc: 4,
        lac: 24002,
        cid: 201,
        lat: 21.032123,
        lon: 105.814567,
        address: "BTS Viettel - Kim Mã",
        range: 600,
      },
      {
        id: 4,
        mcc: 452,
        mnc: 4,
        lac: 24003,
        cid: 301,
        lat: 21.028511,
        lon: 105.854167,
        address: "BTS Viettel - Hồ Gươm",
        range: 500,
      },
    ];

    // 2. Danh sách Thiết bị & Lịch sử di chuyển
    const mockDevices: DeviceLocation[] = [
      {
        id: "dev-001",
        device_name: "Samsung Galaxy S23 Ultra",
        lat: 21.0285,
        lon: 105.8541, // Vị trí hiện tại (Hồ Gươm)
        timestamp: new Date().toLocaleString(),
        status: "ONLINE",
        history: [
          [21.0205, 105.7645], // Mỹ Đình (Quá khứ)
          [21.0369, 105.7823], // Cầu Giấy
          [21.0321, 105.8145], // Kim Mã
          [21.0285, 105.8541], // Hồ Gươm (Hiện tại)
        ],
      },
    ];

    setStations(mockStations);
    setDevices(mockDevices);

    // *GHI CHÚ: Sau này bạn thay đoạn này bằng axios.get('/api/devices') ...
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {/* Container Bản Đồ */}
      <MapContainer
        center={[21.028511, 105.814167]} // Tâm bản đồ (Giữa Hà Nội)
        zoom={13}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Nền bản đồ (OpenStreetMap miễn phí) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* --- RENDER TRẠM BTS --- */}
        {stations.map((station) => (
          <React.Fragment key={`bts-${station.id}`}>
            {/* Marker Trạm */}
            <Marker position={[station.lat, station.lon]} icon={btsIcon}>
              <Popup>
                <div style={{ minWidth: "200px" }}>
                  <h3 style={{ margin: "0 0 5px 0", color: "#d32f2f" }}>
                    🗼 {station.address}
                  </h3>
                  <p style={{ margin: 0 }}>
                    <strong>CID:</strong> {station.cid} | <strong>LAC:</strong>{" "}
                    {station.lac}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Tọa độ:</strong> {station.lat}, {station.lon}
                  </p>
                </div>
              </Popup>
            </Marker>

            {/* Vòng tròn vùng phủ sóng (Range) */}
            <Circle
              center={[station.lat, station.lon]}
              radius={station.range}
              pathOptions={{
                color: "blue",
                fillColor: "#2196f3",
                fillOpacity: 0.1,
                weight: 1,
              }}
            />
          </React.Fragment>
        ))}

        {/* --- RENDER THIẾT BỊ --- */}
        {devices.map((dev) => (
          <React.Fragment key={`dev-${dev.id}`}>
            {/* Đường đi lịch sử (Polyline) */}
            <Polyline
              positions={dev.history}
              pathOptions={{ color: "purple", weight: 3, dashArray: "10, 10" }}
            />

            {/* Marker Vị trí hiện tại của thiết bị */}
            <Marker position={[dev.lat, dev.lon]} icon={deviceIcon}>
              <Popup>
                <div style={{ minWidth: "200px" }}>
                  <h3 style={{ margin: "0 0 5px 0", color: "#1976d2" }}>
                    📱 {dev.device_name}
                  </h3>
                  <p>
                    <strong>Trạng thái:</strong>{" "}
                    <span style={{ color: "green", fontWeight: "bold" }}>
                      {dev.status}
                    </span>
                  </p>
                  <p>
                    <strong>Cập nhật:</strong> {dev.timestamp}
                  </p>
                  <p>
                    <strong>Vị trí:</strong> {dev.lat}, {dev.lon}
                  </p>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>

      {/* --- CHÚ THÍCH (LEGEND) --- */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          zIndex: 1000,
          backgroundColor: "white",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0 0 10px rgba(0,0,0,0.2)",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0" }}>Chú thích</h4>
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/3256/3256778.png"
            width="20"
            style={{ marginRight: "5px" }}
          />
          <span>Trạm BTS (Viettel)</span>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/3437/3437364.png"
            width="20"
            style={{ marginRight: "5px" }}
          />
          <span>Thiết bị (S23 Ultra)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: "20px",
              height: "3px",
              backgroundColor: "purple",
              marginRight: "5px",
            }}
          ></div>
          <span>Lịch sử di chuyển</span>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
