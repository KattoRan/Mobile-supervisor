import Sidebar from "./sidebar/sidebar";
import Topbar from "./topbar/topbar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar />
        <main style={{ padding: 12 }}>{children}</main>
      </div>
    </div>
  );
}
