import { useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { api, ApiError, SignupPayload } from "@/lib/api";
import type { AuthUser } from "@/lib/auth-types";
import { AuthContext } from "@/lib/auth-context";

export type { AuthUser } from "@/lib/auth-types";

function persistSession(user: AuthUser, token: string) {
  localStorage.setItem("cw_auth", JSON.stringify(user));
  localStorage.setItem("cw_token", token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("cw_auth");
    localStorage.removeItem("cw_token");
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("cw_token");
    const stored = localStorage.getItem("cw_auth");

    if (!token) {
      setIsLoading(false);
      return;
    }

    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("cw_auth");
      }
    }

    api
      .me()
      .then(({ user: freshUser }) => {
        setUser(freshUser);
        localStorage.setItem("cw_auth", JSON.stringify(freshUser));
      })
      .catch(() => {
        logout();
      })
      .finally(() => setIsLoading(false));
  }, [logout]);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    try {
      const { user: loggedIn, token } = await api.login(email, password);
      setUser(loggedIn);
      persistSession(loggedIn, token);
      return loggedIn;
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw new Error("Unable to reach server. Is the API running?");
    }
  };

  const signup = async (payload: SignupPayload): Promise<AuthUser> => {
    try {
      const { user: registered, token } = await api.signup(payload);
      setUser(registered);
      persistSession(registered, token);
      return registered;
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw new Error("Unable to reach server. Is the API running?");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
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
