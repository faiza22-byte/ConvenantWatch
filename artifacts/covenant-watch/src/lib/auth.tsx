import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface AuthUser {
  email: string;
  role: "admin" | "company";
  companyId?: string;
  companyName?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => AuthUser;
  logout: () => void;
  isLoading: boolean;
}

const mockUsers: Record<string, { password: string; data: AuthUser }> = {
  "cfo@acme.com": {
    password: "acme2025",
    data: { email: "cfo@acme.com", role: "company", companyId: "acme", companyName: "Acme Industries" },
  },
  "cfo@vertex.com": {
    password: "vertex2025",
    data: { email: "cfo@vertex.com", role: "company", companyId: "vertex", companyName: "Vertex Manufacturing" },
  },
  "cfo@cascade.com": {
    password: "cascade2025",
    data: { email: "cfo@cascade.com", role: "company", companyId: "cascade", companyName: "Cascade Logistics" },
  },
  "cfo@summit.com": {
    password: "summit2025",
    data: { email: "cfo@summit.com", role: "company", companyId: "summit", companyName: "Summit Healthcare" },
  },
  "admin@covenantwatch.com": {
    password: "CW_admin2025",
    data: { email: "admin@covenantwatch.com", role: "admin" },
  },
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("cw_auth");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("cw_auth");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, password: string): AuthUser => {
    const account = mockUsers[email];
    if (!account || account.password !== password) {
      throw new Error("Invalid credentials");
    }
    setUser(account.data);
    localStorage.setItem("cw_auth", JSON.stringify(account.data));
    return account.data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("cw_auth");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
