"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, setToken, removeToken, getToken } from "./api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  business_name?: string;
  onboarding_status?: string;
  plan_name?: string;
  available_minutes?: number;
  plivo_number?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = getToken();
      if (!token) { setLoading(false); return; }
      const data = await api("/auth/me");
      setUser(data.user);
    } catch {
      removeToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshUser(); }, []);

  const login = async (email: string, password: string) => {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setUser(data.user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const data = await api("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
