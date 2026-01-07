import React, { useEffect, useState, useCallback } from "react";
import io from "socket.io-client";
import DeviceTable from "../../components/table/device/DeviceTable";
import DeviceDetail from "./DeviceDetail";
import deviceService from "../../services/device";
import type { DeviceRow } from "../../components/table/device/DeviceRow";
import SearchFilterBar from "../../layout/topbar/searchFilterBar";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
};

const tabsWrap: React.CSSProperties = {
  display: "inline-flex",
  gap: 6,
  borderRadius: 8,
  padding: 4,
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: 6,
  border: "none",
  background: active ? "#fff" : "transparent",
  cursor: "pointer",
  fontWeight: active ? 700 : 500,
  color: active ? "#4f46e5" : "#fff",
  transition: "all 0.2s",
});

const refreshBtn: React.CSSProperties = {
  padding: "8px 16px",
  backgroundColor: "#fff",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 500,
  color: "#374151",
  display: "flex",
  alignItems: "center",
  gap: "5px",
};

const Devices: React.FC = () => {
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const [deviceData, setDeviceData] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);
  const limit = 20;
  const [hasMore, setHasMore] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("");

  const mapToDeviceRow = (item: any): DeviceRow => {
    const lastLoc = item.location_history?.[0] || item.last_location;
    const lastCell = item.cell_tower_history?.[0] || item.last_cell;

    let status: "online" | "offline" | "idle" = "offline";
    const lastSeenTime = lastLoc?.recorded_at
      ? new Date(lastLoc.recorded_at)
      : null;

    if (lastSeenTime) {
      const diffMinutes = (Date.now() - lastSeenTime.getTime()) / 60000;
      if (diffMinutes < 5) status = "online";
      else if (diffMinutes < 60) status = "idle";
    }

    return {
      id: item.id,
      userId: item.user?.id || "",
      deviceName: item.model || "Không tên",
      userName: item.user?.full_name || "Chưa đăng ký",
      phoneNumber: item.phone_number,
      status,
      lastSeen: lastSeenTime ? lastSeenTime.toLocaleString("vi-VN") : "-",
      gps: lastLoc
        ? `${Number(lastLoc.latitude).toFixed(4)}, ${Number(
            lastLoc.longitude
          ).toFixed(4)}`
        : "-",
      cellId: lastCell?.cid ? String(lastCell.cid) : "-",
      lacTac: lastCell?.lac ? String(lastCell.lac) : "-",
      mccMnc:
        lastCell?.mcc && lastCell?.mnc
          ? `${lastCell.mcc}/${lastCell.mnc}`
          : "-",
    };
  };

  const fetchDevices = useCallback(
    async (pageNumber: number, append: boolean = false) => {
      if (loading && pageNumber !== 1) return;

      try {
        setLoading(true);
        const response = await deviceService.getAll(pageNumber, limit);

        const rawItems = Array.isArray(response) ? response : response.data;

        const mapped = rawItems.map((item: any) => mapToDeviceRow(item));

        if (mapped.length < limit) setHasMore(false);

        if (append) {
          setDeviceData((prev) => [...prev, ...mapped]);
        } else {
          setDeviceData(mapped);
        }
      } catch (error) {
        console.error("Lỗi khi tải thiết bị:", error);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchDevices(1, false);
  }, []);

  useEffect(() => {
    const socket = io(API_BASE_URL);

    socket.on("connect", () => {
      console.log("Connected to Socket Server");
    });

    socket.on("device_moved", (payload: any) => {
      setDeviceData((currentList) => {
        return currentList.map((dev) => {
          if (dev.id === payload.deviceId) {
            return {
              ...dev,
              status: "online",
              lastSeen: new Date(payload.timestamp).toLocaleString("vi-VN"),
              gps: `${Number(payload.lat).toFixed(4)}, ${Number(
                payload.lon
              ).toFixed(4)}`,
              cellId: payload.cid ? String(payload.cid) : dev.cellId,
              lacTac: payload.lac ? String(payload.lac) : dev.lacTac,
            };
          }
          return dev;
        });
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleLoadMore = () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDevices(nextPage, true);
  };

  const handleViewDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setViewMode("detail");
  };

  const handleBackToList = () => {
    setSelectedDeviceId(null);
    setViewMode("list");
    setPage(1);
    setHasMore(true);
    fetchDevices(1, false);
  };

  if (viewMode === "detail" && selectedDeviceId) {
    return (
      <DeviceDetail deviceId={selectedDeviceId} onBack={handleBackToList} />
    );
  }

  const filteredData = deviceData.filter((device) => {
    const q = searchQuery.toLowerCase();
    return (
      (device.userName.toLowerCase().includes(q) ||
        device.deviceName.toLowerCase().includes(q) ||
        device.phoneNumber?.toLowerCase().includes(q)) &&
      (!filter ||
        (filter === "active" && device.status === "online") ||
        (filter === "inactive" && device.status === "offline"))
    );
  });

  return (
    <div>
      <div style={headerStyle}>
        <div style={tabsWrap}>
          <button style={tabBtn(true)}>Danh sách thiết bị</button>
        </div>

        <button
          style={refreshBtn}
          onClick={() => {
            setPage(1);
            setHasMore(true);
            fetchDevices(1, false);
          }}
          disabled={loading}
        >
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      <SearchFilterBar
        onSearch={setSearchQuery}
        onFilter={setFilter}
        enableFilter
      />

      <DeviceTable
        data={filteredData}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        onViewDevice={handleViewDevice}
      />
    </div>
  );
};

export default Devices;
