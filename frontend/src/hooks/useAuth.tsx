"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_URL, api, clearToken, getToken, setToken } from "@/lib/api";
import { refreshSocketAuth } from "@/lib/socket";
import type { AuthUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  googleEnabled: boolean;
  isAdmin: boolean;
  login: () => void;
  logout: () => void;
  /** Called by the /auth/callback page once a token arrives. */
  handleToken: (token: string) => Promise<void>;
  authenticate: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const loadUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await api.me());
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    api
      .authStatus()
      .then((s) => setGoogleEnabled(s.googleEnabled))
      .catch(() => setGoogleEnabled(false));
  }, [loadUser]);

  const login = useCallback(() => {
    window.location.href = `${API_URL}/api/auth/google`;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    refreshSocketAuth();
  }, []);

  const handleToken = useCallback(
    async (token: string) => {
      setToken(token);
      refreshSocketAuth();
      await loadUser();
    },
    [loadUser]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      googleEnabled,
      isAdmin: user?.role === "admin",
      login,
      logout,
      handleToken,
      authenticate: handleToken,
    }),
    [user, loading, googleEnabled, login, logout, handleToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
