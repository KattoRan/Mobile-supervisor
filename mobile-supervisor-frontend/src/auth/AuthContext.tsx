import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface User {
  id?: string;
  email?: string;
  name: string;
  role?: string;
}

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = sessionStorage.getItem("userToken");
      const raw = sessionStorage.getItem("user");
      if (token && raw) {
        const parsed = JSON.parse(raw) as User;
        setUser(parsed);
      }
    } catch {
      sessionStorage.removeItem("userToken");
      sessionStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (u: User, token: string) => {
    sessionStorage.setItem("userToken", token);
    sessionStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    sessionStorage.removeItem("userToken");
    sessionStorage.removeItem("user");
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
