"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io } from "socket.io-client";
import { API_URL } from "@/lib/config";

type Handler = (payload: unknown) => void;

type RealtimeContextType = {
  connected: boolean;
  subscribe: (event: string, handler: Handler) => () => void;
};

const RealtimeContext = createContext<RealtimeContextType>({
  connected: false,
  subscribe: () => () => undefined,
});

/**
 * One authenticated Socket.IO connection for the whole admin area.
 * Pages subscribe to events with useRealtimeEvent().
 */
export function RealtimeProvider({
  token,
  onAuthError,
  children,
}: {
  token: string;
  onAuthError: () => void;
  children: ReactNode;
}) {
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Map<string, Set<Handler>>());
  const authErrorRef = useRef(onAuthError);

  useEffect(() => {
    authErrorRef.current = onAuthError;
  });

  useEffect(() => {
    const socket = io(API_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("connect_error", (error) => {
      setConnected(false);

      // The server rejects bad or expired tokens during the handshake.
      if (/token|authentication|inactive|permissions/i.test(error.message)) {
        socket.disconnect();
        authErrorRef.current();
      }
    });

    socket.onAny((event: string, payload: unknown) => {
      listeners.current.get(event)?.forEach((handler) => handler(payload));
    });

    return () => {
      socket.offAny();
      socket.disconnect();
    };
  }, [token]);

  const subscribe = useCallback((event: string, handler: Handler) => {
    const set = listeners.current.get(event) ?? new Set<Handler>();
    set.add(handler);
    listeners.current.set(event, set);

    return () => {
      set.delete(handler);
    };
  }, []);

  const value = useMemo<RealtimeContextType>(
    () => ({ connected, subscribe }),
    [connected, subscribe],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeStatus() {
  return useContext(RealtimeContext).connected;
}

/** Runs handler whenever the server emits `event`. */
export function useRealtimeEvent<T>(event: string, handler: (payload: T) => void) {
  const { subscribe } = useContext(RealtimeContext);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(
    () => subscribe(event, (payload) => handlerRef.current(payload as T)),
    [subscribe, event],
  );
}
