import { createContext } from "react";
import type { AuthUser } from "@/lib/auth-types";

export interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (payload: import("@/lib/api").SignupPayload) => Promise<AuthUser>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
