import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useGetMe } from "@workspace/api-client-react";

interface User {
  id: number;
  email: string;
  name: string;
  role: "client" | "vendor" | "admin";
  langPref?: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("user");
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const { data: meData, isLoading, isError } = useGetMe({
    query: { enabled: !!token, retry: false, staleTime: 1000 * 60 * 5 } as any,
  });

  useEffect(() => {
    if (meData) {
      const u = meData as User;
      setUser(u);
      localStorage.setItem("user", JSON.stringify(u));
    }
  }, [meData]);

  useEffect(() => {
    if (isError) {
      setToken(null);
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }, [isError]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const isLoadingState = !!token && !user && isLoading;

  return (
    <AuthContext.Provider value={{ user, token, isLoading: isLoadingState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
