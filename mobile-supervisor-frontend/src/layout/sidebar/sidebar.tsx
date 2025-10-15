import { NavLink } from "react-router-dom";
import styles from "./sidebar.module.css";

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>Device Monitor</div>
      <nav className={styles.nav}>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
          }
        >
          Tổng quan
        </NavLink>
        <NavLink
          to="/devices"
          className={({ isActive }) =>
            isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
          }
        >
          Thiết bị
        </NavLink>
        <NavLink
          to="/bts-lookup"
          className={({ isActive }) =>
            isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
          }
        >
          Tra cứu BTS
        </NavLink>
      </nav>
    </aside>
  );
}
