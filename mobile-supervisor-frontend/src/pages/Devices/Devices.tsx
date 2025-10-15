import React, { useMemo, useState } from "react";
import DeviceTable from "../../components/table/device/DeviceTable";
import type { DeviceRow } from "../../components/table/device/DeviceRow";

type TabKey = "list" | "map";

const tabsWrap: React.CSSProperties = {
  display: "inline-flex",
  gap: 6,
  background: "#f6f7f9",
  borderRadius: 8,
  padding: 4,
  marginBottom: 12,
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid transparent",
  background: active ? "#fff" : "transparent",
  cursor: "pointer",
  fontWeight: active ? 700 : 500,
});

const placeholder: React.CSSProperties = {
  border: "1px dashed #d1d5db",
  borderRadius: 12,
  padding: 24,
  color: "#6b7280",
  textAlign: "center",
};

const Devices: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("list");

  const data: DeviceRow[] = useMemo(
    () => [
      {
        id: "1",
        deviceName: "Thiết bị A",
        userName: "Nguyễn Văn A",
        phoneNumber: "+84 912345678",
        status: "online",
        lastSeen: "2025-10-15 09:42",
        gps: "10.7769, 106.7009",
        cellId: "128934",
        lacTac: "5213",
        mccMnc: "452/04",
      },
      {
        id: "2",
        deviceName: "Thiết bị B",
        userName: "Trần Thị B",
        phoneNumber: "0912345678",
        status: "idle",
        lastSeen: "2025-10-15 08:10",
        gps: "21.0278, 105.8342",
        cellId: "76213",
        lacTac: "3341",
        mccMnc: "452/02",
      },
      {
        id: "3",
        deviceName: "Thiết bị C",
        userName: "Lê C",
        phoneNumber: "+84-901-234-567",
        status: "offline",
        lastSeen: "2025-10-14 22:01",
        gps: "16.0471, 108.2068",
        cellId: "54001",
        lacTac: "9087",
        mccMnc: "452/01",
      },
    ],
    []
  );

  return (
    <div>
      <div style={tabsWrap} role="tablist" aria-label="Chế độ hiển thị">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "list"}
          style={tabBtn(tab === "list")}
          onClick={() => setTab("list")}
        >
          Danh sách
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "map"}
          style={tabBtn(tab === "map")}
          onClick={() => setTab("map")}
        >
          Bản đồ
        </button>
      </div>

      {tab === "list" ? (
        <DeviceTable data={data ?? []} />
      ) : (
        <div style={placeholder}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Bản đồ sẽ bổ sung sau
          </div>
          <div>Hiện tại chỉ hiển thị tab “Danh sách”.</div>
        </div>
      )}
    </div>
  );
};

export default Devices;
