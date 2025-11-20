import KPISection from "../../components/kpi/KPISection";
import type { DeviceRow } from "../../components/table/device/DeviceRow";

const mockDevices: DeviceRow[] = [
  {
    id: "1",
    deviceName: "A",
    userName: "User A",
    phoneNumber: "090",
    status: "online",
    lastSeen: "2025-10-15T03:00:00Z",
    gps: "0,0",
    cellId: "1",
    lacTac: "1",
    mccMnc: "452/04",
  },
  {
    id: "2",
    deviceName: "B",
    userName: "User B",
    phoneNumber: "091",
    status: "idle",
    lastSeen: "2025-10-14T03:00:00Z",
    gps: "0,0",
    cellId: "2",
    lacTac: "1",
    mccMnc: "452/02",
  },
  {
    id: "3",
    deviceName: "C",
    userName: "User C",
    phoneNumber: "092",
    status: "offline",
    lastSeen: new Date().toISOString(),
    gps: "0,0",
    cellId: "3",
    lacTac: "1",
    mccMnc: "452/01",
  },
];

// --- Component mới cho Bản đồ ---
const MapSection = () => {
  return (
    <div
      style={{
        flex: 2, // Chiếm 2/3 không gian
        backgroundColor: "white",
        padding: "16px",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "450px", // Chiều cao tối thiểu
      }}
    >
      <span style={{ fontSize: "24px", color: "#888" }}>Biểu đồ</span>
    </div>
  );
};

// --- Component mới cho Danh sách sự kiện ---
const EventItem = ({ text, type }) => (
  <div
    style={{
      padding: "8px 0",
      borderBottom: "1px solid #eee",
    }}
  >
    <span
      style={{
        color: type === "connect" ? "green" : "red",
        fontWeight: "bold",
      }}
    >
      {type === "connect" ? "[Kết nối]" : "[Mất kết nối]"}
    </span>
    <span style={{ marginLeft: "8px" }}>{text}</span>
  </div>
);

const EventsSection = () => {
  return (
    <div
      style={{
        flex: 1, // Chiếm 1/3 không gian
        backgroundColor: "white",
        padding: "16px",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb",
        minHeight: "450px",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          borderBottom: "1px solid #eee",
          paddingBottom: "8px",
        }}
      >
        Sự kiện gần nhất
      </h3>
      <div>
        {/* Dữ liệu mẫu */}
        <EventItem text="Thiết bị A kết nối" type="connect" />
        <EventItem text="Thiết bị B ngắt kết nối" type="disconnect" />
        <EventItem text="Thiết bị C ngắt kết nối" type="disconnect" />
        <EventItem text="Thiết bị D kết nối" type="connect" />
      </div>
    </div>
  );
};

export default function Overview() {
  return (
    <div style={{ padding: 16 }}>
      <KPISection devices={mockDevices} btsLookupsInSession={7} />
      <div style={{ display: "flex", gap: "16px", padding: "20px 0px" }}>
        {/* Cột trái cho bản đồ */}
        <MapSection />

        {/* Cột phải cho sự kiện */}
        <EventsSection />
      </div>
    </div>
  );
}
