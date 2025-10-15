import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

import Login from "./components/auth/login";
import ProtectedRoute from "./components/auth/ProtectedRoute";

interface User {
  id?: string;
  email?: string;
  name: string;
  role?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("userToken");
    const raw = sessionStorage.getItem("user");
    if (token && raw) {
      try {
        const parsed = JSON.parse(raw) as User;
        setUser(parsed);
      } catch {
        sessionStorage.removeItem("userToken");
        sessionStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute user={user} />}>
          <Route path="/" element={<Dashboard />} />
        </Route>

        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </Router>
  );
}

const Dashboard = () => {
  return (
    <>
      <header
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          borderBottom: "1px solid #eee",
          padding: 12,
        }}
      >
        <b>Device Monitor Admin</b>
        <span style={{ marginLeft: "auto" }}>Welcome</span>
        <button>Logout</button>
      </header>
      <main style={{ padding: 12 }}>
        <h1>Vite + React Dashboard</h1>
        <p>This is a protected area.</p>
      </main>
    </>
  );
};

export default App;
