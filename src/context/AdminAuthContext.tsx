"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { ADMIN_TOKEN_KEY } from "@/lib/config";
import type { Admin, AdminRole } from "@/lib/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
};

type AdminAuthContextType = {
  admin: Admin | null;
  token: string | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Authenticated API call; signs the admin out automatically on HTTP 401. */
  request: <T>(path: string, options?: RequestOptions) => Promise<T>;
  /** True when the signed-in admin holds one of the given roles. */
  hasRole: (...roles: AdminRole[]) => boolean;
};

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined,
);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const logout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setAdmin(null);
    setStatus("unauthenticated");
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<{ token: string; admin: Admin }>(
      "/api/admin/login",
      { method: "POST", body: { email, password } },
    );

    sessionStorage.setItem(ADMIN_TOKEN_KEY, result.token);
    setToken(result.token);
    setAdmin(result.admin);
    setStatus("authenticated");
  }, []);

  // Restore the session when the page loads or is refreshed.
  useEffect(() => {
    const controller = new AbortController();

    async function restoreSession() {
      const saved = sessionStorage.getItem(ADMIN_TOKEN_KEY);

      if (!saved) {
        await Promise.resolve();
        setStatus("unauthenticated");
        return;
      }

      try {
        const result = await apiRequest<{ data: Omit<Admin, "status"> }>(
          "/api/admin/me",
          { token: saved, signal: controller.signal },
        );

        setToken(saved);
        setAdmin({ ...result.data, status: "ACTIVE" });
        setStatus("authenticated");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        // Only discard the token when the server rejected it. If the API is
        // simply offline, keep it so a refresh works once the API is back.
        if (error instanceof ApiError && error.status === 0) {
          setStatus("unauthenticated");
          return;
        }

        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        setStatus("unauthenticated");
      }
    }

    void restoreSession();

    return () => controller.abort();
  }, []);

  const request = useCallback(
    async <T,>(path: string, options: RequestOptions = {}) => {
      try {
        return await apiRequest<T>(path, { ...options, token });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) logout();
        throw error;
      }
    },
    [token, logout],
  );

  const hasRole = useCallback(
    (...roles: AdminRole[]) => (admin ? roles.includes(admin.role) : false),
    [admin],
  );

  const value = useMemo(
    () => ({ admin, token, status, login, logout, request, hasRole }),
    [admin, token, status, login, logout, request, hasRole],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  }

  return context;
}
