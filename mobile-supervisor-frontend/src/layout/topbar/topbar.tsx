import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./topbar.module.css";
import { useAuth } from "../../auth/AuthContext";

interface TopbarProps {
  onSearch?: (query: string) => void;
  onFilter?: (value: string) => void;
  onRefresh?: () => void;
}

export default function Topbar({ onSearch, onFilter }: TopbarProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query.trim());
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className={styles.topbar}>
      <form className={styles.search} onSubmit={handleSubmit}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Tìm kiếm..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className={styles.searchButton} type="submit">
          Tìm kiếm
        </button>
      </form>

      <div className={styles.actions}>
        <select
          className={styles.select}
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            onFilter?.(e.target.value);
          }}
        >
          <option value="">Tất cả</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Ngừng hoạt động</option>
        </select>

        <button
          className={styles.logoutButton}
          type="button"
          onClick={handleLogout}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
