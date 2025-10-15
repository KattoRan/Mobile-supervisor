import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Login from "./auth/login";
import ProtectedRoute from "./auth/ProtectedRoute";
import Layout from "./layout/Layout";
import Devices from "./pages/Devices/Devices";
import Overview from "./pages/Overview/Overview";

const BtsLookup = () => <h1>Tra cứu BTS</h1>;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={
              <Layout>
                <Overview />
              </Layout>
            }
          />
          <Route
            path="/devices"
            element={
              <Layout>
                <Devices />
              </Layout>
            }
          />
          <Route
            path="/bts-lookup"
            element={
              <Layout>
                <BtsLookup />
              </Layout>
            }
          />
        </Route>

        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;
