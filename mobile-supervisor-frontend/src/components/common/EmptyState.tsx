import React from "react";

export type EmptyStateProps = {
  title?: string;
  description?: string;
  fullHeight?: boolean;
  className?: string;
};

const EmptyState: React.FC<EmptyStateProps> = ({
  title = "Không có dữ liệu",
  description = "Hiện tại không có nội dung để hiển thị",
  fullHeight = false,
  className,
}) => {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: fullHeight ? "100%" : 220,
    padding: 16,
  };

  const cardStyle: React.CSSProperties = {
    textAlign: "center",
    color: "#3a3a3a",
    background: "#fafafa",
    border: "1px dashed #d9d9d9",
    borderRadius: 10,
    padding: 24,
    maxWidth: 520,
    width: "100%",
  };

  return (
    <div
      style={containerStyle}
      className={className}
      role="status"
      aria-live="polite"
    >
      <div style={cardStyle}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
        {description && <div>{description}</div>}
      </div>
    </div>
  );
};

export default EmptyState;
