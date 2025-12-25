import { NavLink, useNavigate } from "react-router-dom";
import styles from "./sidebar.module.css";
import { useAuth } from "../../auth/AuthContext";

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

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
      </nav>

      {/* Logout */}
      <div className={styles.logoutWrapper}>
        <button className={styles.logoutButton} onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
