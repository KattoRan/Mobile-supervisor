export type DeviceStatus = "online" | "offline" | "idle";

export type DeviceRow = {
  id: string;
  deviceName: string;
  userName: string;
  phoneNumber: string;
  status: DeviceStatus;
  lastSeen: string;
  gps: string;
  cellId: string;
  lacTac: string;
  mccMnc: string;
};

export const STATUS_COLOR_MAP: Record<
  DeviceStatus,
  { bg: string; fg: string }
> = {
  online: { bg: "#e8f8ef", fg: "#0f7a48" },
  offline: { bg: "#ffebea", fg: "#9f1f1a" },
  idle: { bg: "#fff7e6", fg: "#996a00" },
};

export default DeviceRow;
