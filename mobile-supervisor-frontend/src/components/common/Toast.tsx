import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

type ToastType = "info" | "success" | "warning" | "error";
type ToastPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "bottom-center";

export type ToastProps = {
  message: string;
  isOpen: boolean;
  onClose?: () => void;
  type?: ToastType;
  durationMs?: number;
  position?: ToastPosition;
  showCloseButton?: boolean;
};

export const Toast: React.FC<ToastProps> = ({
  message,
  isOpen,
  onClose,
  type = "info",
  durationMs = 3000,
  position = "top-right",
  showCloseButton = true,
}) => {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (durationMs <= 0) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      onClose?.();
    }, durationMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isOpen, durationMs, onClose]);

  const containerStyle = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {
      position: "fixed",
      zIndex: 9999,
      pointerEvents: "none",
      inset: 0,
    };
    return base;
  }, []);

  const boxPositionStyle = useMemo<React.CSSProperties>(() => {
    const edgeGap = 16;
    const centerX: React.CSSProperties = {
      left: "50%",
      transform: "translateX(-50%)",
    };

    switch (position) {
      case "top-left":
        return { top: edgeGap, left: edgeGap };
      case "top-right":
        return { top: edgeGap, right: edgeGap };
      case "bottom-left":
        return { bottom: edgeGap, left: edgeGap };
      case "bottom-right":
        return { bottom: edgeGap, right: edgeGap };
      case "top-center":
        return { top: edgeGap, ...centerX };
      case "bottom-center":
        return { bottom: edgeGap, ...centerX };
      default:
        return { top: edgeGap, right: edgeGap };
    }
  }, [position]);

  const typeStyle = useMemo<React.CSSProperties>(() => {
    const colorMap: Record<
      ToastType,
      { bg: string; fg: string; border: string }
    > = {
      info: { bg: "#e8f4ff", fg: "#0b69a3", border: "#b6dcff" },
      success: { bg: "#e8f8ef", fg: "#0f7a48", border: "#b9eed2" },
      warning: { bg: "#fff7e6", fg: "#996a00", border: "#ffe1a6" },
      error: { bg: "#ffebea", fg: "#9f1f1a", border: "#ffc9c6" },
    };
    const { bg, fg, border } = colorMap[type];
    return {
      backgroundColor: bg,
      color: fg,
      border: `1px solid ${border}`,
    };
  }, [type]);

  if (!isOpen) return null;

  const toast = (
    <div
      style={containerStyle}
      aria-live="polite"
      aria-atomic="true"
      role="alert"
    >
      <div
        style={{
          position: "absolute",
          ...boxPositionStyle,
          pointerEvents: "auto",
          maxWidth: 480,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          borderRadius: 8,
          padding: "12px 14px",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          ...typeStyle,
        }}
      >
        <div style={{ flex: 1, lineHeight: 1.4 }}>{message}</div>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              padding: 4,
              marginLeft: 4,
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(toast, document.body);
  }
  return toast;
};

export default Toast;
