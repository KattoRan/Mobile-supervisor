import React, { useMemo } from "react";
import KPIItem from "./KPIItem";
import styles from "./KPISection.module.css";
import type { DeviceRow } from "../table/device/DeviceRow";

export interface KPISectionProps {
  devices?: DeviceRow[];
  btsLookupsInSession?: number; // số lượt tra cứu BTS trong phiên
  offlineInLast24h?: number; // nếu không truyền, sẽ tự tính từ devices
}

export const KPISection: React.FC<KPISectionProps> = ({
  devices = [],
  btsLookupsInSession = 0,
  offlineInLast24h,
}) => {
  const { total, online, idle, offline, ratioActive } = useMemo(() => {
    const total = devices.length;
    let online = 0;
    let idle = 0;
    let offline = 0;
    for (const d of devices) {
      if (d.status === "online") online++;
      else if (d.status === "idle") idle++;
      else offline++;
    }
    const ratioActive = total > 0 ? ((online + idle) / total) * 100 : 0;
    return { total, online, idle, offline, ratioActive };
  }, [devices]);

  const offline24h = useMemo(() => {
    if (typeof offlineInLast24h === "number") return offlineInLast24h;
    // Simple heuristic: count offline rows with lastSeen within 24h window
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return devices.reduce((acc, d) => {
      if (d.status !== "offline") return acc;
      const t = Date.parse(d.lastSeen);
      if (!isNaN(t) && now - t <= dayMs) return acc + 1;
      return acc;
    }, 0);
  }, [devices, offlineInLast24h]);

  return (
    <div className={styles.grid}>
      <KPIItem
        label="Thiết bị hoạt động"
        value={`${(ratioActive || 0).toFixed(0)}%`}
        subText={`${online + idle}/${total}`}
        icon={"🟢"}
      />
      <KPIItem
        label="Thiết bị offline"
        value={offline24h}
        subText={"trong 24 giờ"}
        icon={"🔴"}
      />
      <KPIItem
        label="BTS tra cứu"
        value={btsLookupsInSession}
        subText={"trong phiên"}
        icon={"📶"}
      />
    </div>
  );
};

export default KPISection;
