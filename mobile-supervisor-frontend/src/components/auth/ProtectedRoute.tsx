import React from "react";
import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
  user: any | null;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
