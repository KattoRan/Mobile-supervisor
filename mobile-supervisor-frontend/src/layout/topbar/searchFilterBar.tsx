// src/components/topbar/SearchFilterBar.tsx
import { useState } from "react";
import styles from "./topbar.module.css";

interface SearchFilterBarProps {
  onSearch?: (query: string) => void;
  onFilter?: (value: string) => void;
  enableFilter?: boolean;
}

export default function SearchFilterBar({
  onSearch,
  onFilter,
  enableFilter = false,
}: SearchFilterBarProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query.trim());
  };

  return (
    <div className={styles.topbar}>
      <form className={styles.search} onSubmit={handleSubmit}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Tìm theo thiết bị, SĐT, người dùng..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className={styles.searchButton} type="submit">
          Tìm kiếm
        </button>
      </form>

      {enableFilter && (
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
        </div>
      )}
    </div>
  );
}
