import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import api, { TOKEN_STORAGE_KEY } from "../services/api";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const applySession = useCallback((session) => {
    if (session?.access_token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
    }
    setUser(session?.user ?? null);
    setOrganization(session?.organization ?? null);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setOrganization(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setUser(null);
      setOrganization(null);
      return null;
    }
    const session = await authService.fetchCurrentUser();
    setUser(session.user);
    setOrganization(session.organization);
    return session;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refreshSession();
      } catch {
        if (active) clearSession();
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshSession, clearSession]);

  useEffect(() => {
    const handleUnauthorized = () => clearSession();
    window.addEventListener("stockflow:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("stockflow:unauthorized", handleUnauthorized);
  }, [clearSession]);

  const login = useCallback(
    async (email, password) => {
      const session = await authService.login(email, password);
      applySession(session);
      return session;
    },
    [applySession]
  );

  const register = useCallback(
    async (payload) => {
      const session = await authService.register(payload);
      applySession(session);
      return session;
    },
    [applySession]
  );

  const logout = useCallback(() => {
    clearSession();
    // Drop any in-flight default header that referenced the old token.
    delete api.defaults.headers.common.Authorization;
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      organization,
      initializing,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshSession,
      setOrganization,
    }),
    [user, organization, initializing, login, register, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
