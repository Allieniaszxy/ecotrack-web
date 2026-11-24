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
import { COLLECTOR_TOKEN_KEY } from "@/lib/config";
import type { Collector } from "@/lib/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
};

type CollectorAuthContextType = {
  collector: Collector | null;
  token: string | null;
  status: AuthStatus;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  /** Authenticated API call; signs the collector out automatically on 401/403. */
  request: <T>(path: string, options?: RequestOptions) => Promise<T>;
};

const CollectorAuthContext = createContext<CollectorAuthContextType | undefined>(
  undefined,
);

export function CollectorAuthProvider({ children }: { children: ReactNode }) {
  const [collector, setCollector] = useState<Collector | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const logout = useCallback(() => {
    sessionStorage.removeItem(COLLECTOR_TOKEN_KEY);
    setToken(null);
    setCollector(null);
    setStatus("unauthenticated");
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    // The API returns { token, collector } at the top level.
    const result = await apiRequest<{ token: string; collector: Collector }>(
      "/api/collector/login",
      { method: "POST", body: { identifier, password } },
    );

    sessionStorage.setItem(COLLECTOR_TOKEN_KEY, result.token);
    setToken(result.token);
    setCollector(result.collector);
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function restoreSession() {
      const saved = sessionStorage.getItem(COLLECTOR_TOKEN_KEY);

      if (!saved) {
        await Promise.resolve();
        setStatus("unauthenticated");
        return;
      }

      try {
        const result = await apiRequest<{ data: Collector }>(
          "/api/collector/me",
          { token: saved, signal: controller.signal },
        );

        setToken(saved);
        setCollector(result.data);
        setStatus("authenticated");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (error instanceof ApiError && error.status === 0) {
          setStatus("unauthenticated");
          return;
        }

        sessionStorage.removeItem(COLLECTOR_TOKEN_KEY);
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
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          logout();
        }
        throw error;
      }
    },
    [token, logout],
  );

  const value = useMemo(
    () => ({ collector, token, status, login, logout, request }),
    [collector, token, status, login, logout, request],
  );

  return (
    <CollectorAuthContext.Provider value={value}>
      {children}
    </CollectorAuthContext.Provider>
  );
}

export function useCollectorAuth() {
  const context = useContext(CollectorAuthContext);

  if (!context) {
    throw new Error(
      "useCollectorAuth must be used inside CollectorAuthProvider",
    );
  }

  return context;
}
