import React, { useEffect, useState, useCallback } from "react";
import KPISection from "../../components/kpi/KPISection";
import type { DeviceRow } from "../../components/table/device/DeviceRow";
import deviceService from "../../services/device";
import io, { Socket } from "socket.io-client";

// =========================
// TYPES
// =========================
interface DeviceMovedPayload {
  deviceId: string;
  timestamp: string;
  lat: number;
  lon: number;
  cid?: number;
  lac?: number;
}

interface EventLog {
  text: string;
  type: "connect" | "disconnect";
}

// =========================
// MAP SECTION
// =========================
const MapSection: React.FC = () => {
  return (
    <div
      style={{
        flex: 2,
        backgroundColor: "white",
        padding: 16,
        borderRadius: 8,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb",
        minHeight: 450,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 24, color: "#888" }}>Biểu đồ</span>
    </div>
  );
};

// =========================
// EVENT ITEM
// =========================
const EventItem: React.FC<EventLog> = ({ text, type }) => (
  <div style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
    <span
      style={{
        color: type === "connect" ? "green" : "red",
        fontWeight: "bold",
      }}
    >
      {type === "connect" ? "[Kết nối]" : "[Mất kết nối]"}
    </span>
    <span style={{ marginLeft: 8 }}>{text}</span>
  </div>
);

// =========================
// EVENTS SECTION
// =========================
const EventsSection: React.FC<{ events: EventLog[] }> = ({ events }) => {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "white",
        padding: 16,
        borderRadius: 8,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb",
        minHeight: 450,
        overflowY: "auto",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          borderBottom: "1px solid #eee",
          paddingBottom: 8,
        }}
      >
        Sự kiện gần nhất
      </h3>

      {events.map((e, idx) => (
        <EventItem key={idx} text={e.text} type={e.type} />
      ))}
    </div>
  );
};

// =========================
// STATUS LOGIC
// =========================
const computeStatus = (timestamp: string): "online" | "idle" | "offline" => {
  const t = new Date(timestamp);
  const diffMinutes = (Date.now() - t.getTime()) / 60000;

  if (diffMinutes < 5) return "online";
  if (diffMinutes < 60) return "idle";
  return "offline";
};

// =========================
// MAP TO DEVICEROW
// =========================
const mapToDeviceRow = (item: any): DeviceRow => {
  const lastLoc = item.last_location || item.location_history?.[0];

  const status: "online" | "idle" | "offline" = lastLoc?.recorded_at
    ? computeStatus(lastLoc.recorded_at)
    : "offline";

  return {
    id: item.id,
    userId: item.user_id,
    deviceName: item.model || "Không tên",
    userName: item.user?.full_name || "Chưa đăng ký",
    phoneNumber: item.phone_number,
    status,
    lastSeen: lastLoc?.recorded_at || "-",
    gps: lastLoc
      ? `${Number(lastLoc.latitude).toFixed(4)}, ${Number(
          lastLoc.longitude
        ).toFixed(4)}`
      : "-",
    cellId: "-",
    lacTac: "-",
    mccMnc: "-",
  };
};

// =========================
// MAIN OVERVIEW (TS)
// =========================
const Overview: React.FC = () => {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);

  // =========================
  // FETCH INITIAL DEVICES
  // =========================
  const loadDevices = useCallback(async () => {
    const response = await deviceService.getAll(1, 100);
    const rawItems = Array.isArray(response) ? response : response.data;
    setDevices(rawItems.map(mapToDeviceRow));
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // =========================
  // SOCKET REALTIME ONLINE
  // =========================
  useEffect(() => {
    const socket: Socket = io("http://13.236.208.62:3000");

    socket.on("device_moved", (payload: DeviceMovedPayload) => {
      const { deviceId, timestamp, lat, lon } = payload;

      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId
            ? {
                ...d,
                status: "online",
                lastSeen: timestamp,
                gps: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
              }
            : d
        )
      );

      setEvents((prev) => [
        { text: `Thiết bị ${deviceId} đã online`, type: "connect" },
        ...prev.slice(0, 9),
      ]);
    });

    return () => {
      socket.disconnect(); // ✔ cleanup đúng chuẩn
    };
  }, []);

  // =========================
  // AUTO CHECK IDLE / OFFLINE
  // =========================
  useEffect(() => {
    const timer = setInterval(() => {
      setDevices((prevDevices) =>
        prevDevices.map((d) => {
          if (d.lastSeen === "-") return { ...d, status: "offline" };

          const newStatus = computeStatus(d.lastSeen);

          if (newStatus !== d.status) {
            setEvents((prev) => [
              {
                text:
                  newStatus === "offline"
                    ? `Thiết bị ${d.id} đã offline`
                    : `Thiết bị ${d.id} chuyển sang trạng thái ${newStatus}`,
                type: newStatus === "offline" ? "disconnect" : "connect",
              },
              ...prev.slice(0, 9),
            ]);
          }

          return { ...d, status: newStatus };
        })
      );
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <KPISection devices={devices} btsLookupsInSession={7} />

      <div style={{ display: "flex", gap: 16, padding: "20px 0" }}>
        <MapSection />
        <EventsSection events={events} />
      </div>
    </div>
  );
};

export default Overview;
