import React from "react";
import styles from "./KPIItem.module.css";

export interface KPIItemProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  subText?: string;
}

export const KPIItem: React.FC<KPIItemProps> = ({
  label,
  value,
  icon,
  subText,
}) => {
  return (
    <div className={styles.card} role="group" aria-label={label}>
      {icon && (
        <div className={styles.icon} aria-hidden>
          {icon}
        </div>
      )}
      <div className={styles.content}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
        {subText && <span className={styles.muted}>{subText}</span>}
      </div>
    </div>
  );
};

export default KPIItem;
