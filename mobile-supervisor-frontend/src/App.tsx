import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import Login from "./components/auth/login";

function App() {
  const [count, setCount] = useState(0);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setUser({ name: "Admin" });
  }, []);

  if (!user) {
    return <Login />;
  }

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
        <span style={{ marginLeft: "auto" }}>{user.name}</span>
        <button
          onClick={() => {
            localStorage.removeItem("access_token");
            setUser(null);
          }}
        >
          Logout
        </button>
      </header>

      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((c) => c + 1)}>count is {count}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
