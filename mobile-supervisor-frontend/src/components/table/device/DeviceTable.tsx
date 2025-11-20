import React, { useMemo, useState } from "react";
import type { DeviceRow } from "./DeviceRow";
import styles from "./DeviceTable.module.css";
import EmptyState from "../../common/EmptyState";

type SortKey = keyof Pick<
  DeviceRow,
  | "deviceName"
  | "userName"
  | "status"
  | "lastSeen"
  | "gps"
  | "cellId"
  | "lacTac"
  | "mccMnc"
>;
type SortDir = "asc" | "desc";

export interface DeviceTableProps {
  data?: DeviceRow[];
  onRowClick?: (row: DeviceRow) => void;
}

function compare(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function compareByKey(a: DeviceRow, b: DeviceRow, key: SortKey) {
  if (key === "lastSeen") {
    const da = Date.parse(a.lastSeen);
    const db = Date.parse(b.lastSeen);
    if (!isNaN(da) && !isNaN(db)) return da - db;
  }
  return compare(String(a[key] ?? ""), String(b[key] ?? ""));
}

export const DeviceTable: React.FC<DeviceTableProps> = ({
  data,
  onRowClick,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>("deviceName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const sign = sortDir === "asc" ? 1 : -1;
      return sign * compareByKey(a, b, sortKey);
    });
    return copy;
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => (
    <span
      className={active ? styles.sortIconActive : styles.sortIcon}
      aria-hidden="true"
    >
      {dir === "asc" ? "▲" : "▼"}
    </span>
  );

  const statusClass = (s: DeviceRow["status"]) =>
    s === "online"
      ? styles.statusOnline
      : s === "offline"
      ? styles.statusOffline
      : styles.statusIdle;

  return (
    <div role="region" aria-label="Bảng thiết bị">
      {sorted.length === 0 ? (
        <EmptyState fullHeight description="Không có dữ liệu thiết bị." />
      ) : (
        <table className={styles.table} role="table">
          <thead>
            <tr>
              <th className={styles.th}>
                <button
                  type="button"
                  className={styles.thButton}
                  onClick={() => toggleSort("deviceName")}
                  aria-label="Sắp xếp theo Thiết bị"
                >
                  Thiết bị{" "}
                  <SortIcon active={sortKey === "deviceName"} dir={sortDir} />
                </button>
              </th>
              <th className={styles.th}>
                <button
                  type="button"
                  className={styles.thButton}
                  onClick={() => toggleSort("userName")}
                  aria-label="Sắp xếp theo Người dùng"
                >
                  Người dùng{" "}
                  <SortIcon active={sortKey === "userName"} dir={sortDir} />
                </button>
              </th>
              <th className={styles.th}>SĐT</th>
              <th className={styles.th}>
                <button
                  type="button"
                  className={styles.thButton}
                  onClick={() => toggleSort("status")}
                  aria-label="Sắp xếp theo Trạng thái"
                >
                  Trạng thái{" "}
                  <SortIcon active={sortKey === "status"} dir={sortDir} />
                </button>
              </th>
              <th className={styles.th}>
                <button
                  type="button"
                  className={styles.thButton}
                  onClick={() => toggleSort("lastSeen")}
                  aria-label="Sắp xếp theo Lần cuối"
                >
                  Lần cuối{" "}
                  <SortIcon active={sortKey === "lastSeen"} dir={sortDir} />
                </button>
              </th>
              <th className={styles.th}>
                <button
                  type="button"
                  className={styles.thButton}
                  onClick={() => toggleSort("gps")}
                  aria-label="Sắp xếp theo GPS"
                >
                  GPS <SortIcon active={sortKey === "gps"} dir={sortDir} />
                </button>
              </th>
              <th className={styles.th}>
                <button
                  type="button"
                  className={styles.thButton}
                  onClick={() => toggleSort("cellId")}
                  aria-label="Sắp xếp theo CellID"
                >
                  CellID{" "}
                  <SortIcon active={sortKey === "cellId"} dir={sortDir} />
                </button>
              </th>
              <th className={styles.th}>
                <button
                  type="button"
                  className={styles.thButton}
                  onClick={() => toggleSort("lacTac")}
                  aria-label="Sắp xếp theo LAC/TAC"
                >
                  LAC/TAC{" "}
                  <SortIcon active={sortKey === "lacTac"} dir={sortDir} />
                </button>
              </th>
              <th className={styles.th}>
                <button
                  type="button"
                  className={styles.thButton}
                  onClick={() => toggleSort("mccMnc")}
                  aria-label="Sắp xếp theo MCC/MNC"
                >
                  MCC/MNC{" "}
                  <SortIcon active={sortKey === "mccMnc"} dir={sortDir} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const phone = row.phoneNumber;
              return (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? styles.rowClickable : undefined}
                >
                  <td className={styles.td}>{row.deviceName}</td>
                  <td className={styles.td}>{row.userName}</td>
                  <td
                    className={styles.td}
                    aria-label={`Số điện thoại của ${row.userName}`}
                  >
                    {phone}
                  </td>
                  <td className={styles.td}>
                    <span
                      className={`${styles.pill} ${statusClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className={styles.td}>{row.lastSeen}</td>
                  <td className={styles.td}>{row.gps}</td>
                  <td className={styles.td}>{row.cellId}</td>
                  <td className={styles.td}>{row.lacTac}</td>
                  <td className={styles.td}>{row.mccMnc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DeviceTable;
