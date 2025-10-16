import React, { useEffect, useMemo, useState } from "react";
import BTSLookupForm from "../../components/forms/BTSLookupForm";
import type { LookupRequest } from "../../components/forms/BTSLookupForm";
import styles from "./BTSLookup.module.css";

type HistoryItem = {
  id: string;
  payload: LookupRequest;
  time: number;
};

const HISTORY_KEY = "bts_lookup_history_v1";
const MAX_HISTORY = 20;

export default function BTSLookup() {
  const [mockResult, setMockResult] = useState<Record<string, any> | null>(
    null
  );
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history từ localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {}
  }, [history]);

  // Submit từ form (UI-only)
  const handleSubmit = (payload: LookupRequest) => {
    console.log("📡 Payload nhận từ form:", payload);

    // Mock kết quả
    setMockResult({
      ...payload,
      result: "Giả lập kết quả tra cứu (mock data)",
      cellName: "VNPT_HN_12345",
      location: "Cầu Giấy, Hà Nội",
      queriedAt: new Date().toISOString(),
    });

    // Thêm vào lịch sử (dedupe)
    const sig = JSON.stringify(payload);
    const existsIndex = history.findIndex(
      (h) => JSON.stringify(h.payload) === sig
    );
    let next = [...history];
    if (existsIndex !== -1) {
      const existing = next.splice(existsIndex, 1)[0];
      next.unshift({ ...existing, time: Date.now() });
    } else {
      next.unshift({
        id: Math.random().toString(36).slice(2, 9),
        payload,
        time: Date.now(),
      });
      if (next.length > MAX_HISTORY) next = next.slice(0, MAX_HISTORY);
    }
    setHistory(next);
  };

  // Chỉ chạy lại tra cứu với payload đã lưu (không đổ vào form)
  const reuseItem = (item: HistoryItem) => {
    handleSubmit(item.payload);
  };

  const removeOne = (id: string) =>
    setHistory((prev) => prev.filter((x) => x.id !== id));
  const clearAll = () => setHistory([]);

  const formattedHistory = useMemo(
    () =>
      history.map((h) => ({
        ...h,
        timeStr: new Date(h.time).toLocaleString(),
      })),
    [history]
  );

  return (
    <div className={styles.container}>
      {/* Cột trái: Form + Kết quả */}
      <div className={styles.mainCol}>
        <div className={styles.formHeader}>
          <h1 className={styles.title}>Tra cứu BTS</h1>
          <p className={styles.subtitle}>
            Nhập thông tin trạm gốc (MCC, MNC, LAC/TAC, CellID) để tra cứu.
          </p>
        </div>

        <BTSLookupForm onSubmit={handleSubmit} />

        {mockResult && (
          <div className={styles.resultBox}>
            <h2 className={styles.resultTitle}>Kết quả tra cứu</h2>
            <pre className={styles.resultPre}>
              {JSON.stringify(mockResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Cột phải: Lịch sử */}
      <div className={styles.sideCol}>
        <div className={styles.historyHeader}>
          <h2 className={styles.historyTitle}>Lịch sử tra cứu</h2>
          {history.length > 0 && (
            <button className={styles.clearBtn} onClick={clearAll}>
              Xoá tất cả
            </button>
          )}
        </div>
        <div className={styles.historyBox}>
          {history.length === 0 ? (
            <div className={styles.historyEmpty}>Chưa có lịch sử.</div>
          ) : (
            <ul className={styles.historyList}>
              {formattedHistory.map((h) => (
                <li key={h.id} className={styles.historyItem}>
                  <div className={styles.historyPayload}>
                    <code>
                      MCC {h.payload.mcc} | MNC {h.payload.mnc} | LAC/TAC{" "}
                      {h.payload.lacTac} | CID {h.payload.cellId}
                      {h.payload.earfcn ? ` | EARFCN ${h.payload.earfcn}` : ""}
                      {h.payload.pci ? ` | PCI ${h.payload.pci}` : ""}
                    </code>
                    <div className={styles.historyTime}>{h.timeStr}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
