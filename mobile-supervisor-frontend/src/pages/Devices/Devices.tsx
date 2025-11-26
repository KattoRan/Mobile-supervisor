import React, { useEffect, useState, useCallback } from "react";
import DeviceTable from "../../components/table/device/DeviceTable";
import DeviceDetail from "./DeviceDetail";
import deviceService from "../../services/device";
import type { DeviceRow } from "../../components/table/device/DeviceRow";

// --- STYLES ---
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

// --- COMPONENT ---
const Devices: React.FC = () => {
  // view mode
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // table data
  const [deviceData, setDeviceData] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // pagination
  const [page, setPage] = useState<number>(1);
  const limit = 20; // bạn có thể thay đổi

  const [hasMore, setHasMore] = useState<boolean>(true);

  // Mapping function
  const mapToDeviceRow = (item: any): DeviceRow => {
    const lastLoc = item.location_history?.[0];
    const lastCell = item.cell_tower_history?.[0];

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
      userId: item.user_id,
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

  // Fetch API with pagination
  const fetchDevices = useCallback(
    async (pageNumber: number, append: boolean = false) => {
      if (loading) return;

      try {
        setLoading(true);
        const rawData = await deviceService.getAll(pageNumber, limit); // <-- API phải hỗ trợ

        const mapped = rawData.data.map((item: any) => mapToDeviceRow(item));

        // nếu số bản ghi < limit => hết data
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

  // Load page 1 khi vào trang
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchDevices(1, false);
  }, []);

  // gọi khi scroll đến đáy
  const handleLoadMore = () => {
    if (loading || !hasMore) return;

    const nextPage = page + 1;
    setPage(nextPage);
    fetchDevices(nextPage, true);
  };

  // handle view detail
  const handleViewDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setViewMode("detail");
  };

  const handleBackToList = () => {
    setSelectedDeviceId(null);
    setViewMode("list");
    // refresh page 1
    setPage(1);
    setHasMore(true);
    fetchDevices(1, false);
  };

  // RENDER
  if (viewMode === "detail" && selectedDeviceId) {
    return (
      <DeviceDetail deviceId={selectedDeviceId} onBack={handleBackToList} />
    );
  }

  return (
    <div>
      <div style={headerStyle}>
        {/* Tabs */}
        <div style={tabsWrap}>
          <button style={tabBtn(true)}>Danh sách thiết bị</button>
        </div>

        <button
          style={refreshBtn}
          onClick={() => fetchDevices(1, false)}
          disabled={loading}
        >
          {loading ? "Đang tải..." : "🔄 Làm mới"}
        </button>
      </div>

      <DeviceTable
        data={deviceData}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        onViewDevice={handleViewDevice}
        onViewUser={(userId) => console.log("Xem user:", userId)}
      />
    </div>
  );
};

export default Devices;
