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
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  OctagonAlert,
  X,
} from "lucide-react";
import { useRealtimeEvent } from "@/context/RealtimeContext";
import { useNow } from "@/hooks/useNow";
import { timeAgo } from "@/lib/format";
import type { Assignment, BinAlert, BinEmptiedEvent } from "@/lib/types";

type Kind = "success" | "info" | "warning" | "danger";

export type AppNotification = {
  id: string;
  kind: Kind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string;
};

type NotificationContextType = {
  items: AppNotification[];
  unread: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "ecotrack_admin_notifications";
const MAX_ITEMS = 50;
const TOAST_MS = 8000;

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

const kindStyle: Record<Kind, { icon: typeof Info; tone: string }> = {
  success: { icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
  info: { icon: Info, tone: "bg-blue-50 text-blue-700" },
  warning: { icon: AlertTriangle, tone: "bg-amber-50 text-amber-700" },
  danger: { icon: OctagonAlert, tone: "bg-red-50 text-red-700" },
};

function loadStored(): AppNotification[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as AppNotification[]).slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>(loadStored);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or unavailable: notifications just will not persist.
    }
  }, [items]);

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach(clearTimeout);
  }, []);

  const push = useCallback((entry: Omit<AppNotification, "id" | "at" | "read">) => {
    counter.current += 1;

    const notification: AppNotification = {
      ...entry,
      id: `${Date.now()}-${counter.current}`,
      at: new Date().toISOString(),
      read: false,
    };

    setItems((current) => [notification, ...current].slice(0, MAX_ITEMS));
    setToasts((current) => [...current, notification].slice(-4));

    const timer = setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== notification.id));
      timers.current.delete(timer);
    }, TOAST_MS);

    timers.current.add(timer);
  }, []);

  /* ----------------------- live events -> notifications ----------------------- */

  useRealtimeEvent<Assignment>("assignment:updated", (assignment) => {
    // Only tell the admin about things the collector did.
    if (assignment.changedBy !== "COLLECTOR") return;

    const bin = assignment.bin.name || assignment.binId;
    const collector = assignment.collector.fullName;
    const href = `/admin/assignments?open=${assignment.id}`;
    const lastNote = [...assignment.statusHistory].reverse().find((h) => h.note)?.note;

    switch (assignment.status) {
      case "COMPLETED":
        push({
          kind: "success",
          title: "Collection completed",
          body: `${collector} has collected ${bin}. Open it to send a word of thanks.`,
          href,
        });
        break;
      case "ACCEPTED":
        push({ kind: "info", title: "Assignment accepted", body: `${collector} accepted ${bin}.`, href });
        break;
      case "IN_PROGRESS":
        push({ kind: "info", title: "Collection under way", body: `${collector} is working on ${bin}.`, href });
        break;
      case "ISSUE_REPORTED":
        push({
          kind: "warning",
          title: "Issue reported",
          body: `${collector} reported a problem at ${bin}${lastNote ? `: ${lastNote}` : "."}`,
          href,
        });
        break;
      default:
        break;
    }
  });

  useRealtimeEvent<BinAlert>("bin:alert", (alert) => {
    const bin = alert.bin.name || alert.binId;
    const critical = alert.severity === "CRITICAL";

    push({
      kind: critical ? "danger" : "warning",
      title: critical ? "Critical: bin is full" : "Bin almost full",
      body: `${bin} is ${alert.fillLevel.toFixed(0)}% full.`,
      href: `/admin/assignments?bin=${encodeURIComponent(alert.binId)}&alert=${alert.id}`,
    });
  });

  useRealtimeEvent<BinEmptiedEvent>("bin:emptied", (event) => {
    push({
      kind: "success",
      title: "Sensor confirms bin is empty",
      body: `${event.name || event.binId} dropped from ${event.previousFill.toFixed(0)}% to ${event.fillLevel.toFixed(0)}%.`,
      href: "/admin/bins",
    });
  });

  /* ------------------------------- actions -------------------------------- */

  const markAllRead = useCallback(
    () => setItems((current) => current.map((n) => ({ ...n, read: true }))),
    [],
  );
  const markRead = useCallback(
    (id: string) => setItems((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n))),
    [],
  );
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      unread: items.filter((n) => !n.read).length,
      markAllRead,
      markRead,
      clear,
    }),
    [items, markAllRead, markRead, clear],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      <div
        className="pointer-events-none fixed right-4 top-20 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const { icon: Icon, tone } = kindStyle[toast.kind];
          const content = (
            <>
              <span className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${tone}`}>
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">{toast.title}</span>
                <span className="mt-0.5 block text-sm text-slate-600">{toast.body}</span>
              </span>
            </>
          );

          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
            >
              {toast.href ? (
                <Link href={toast.href} className="flex min-w-0 flex-1 items-start gap-3" onClick={() => markRead(toast.id)}>
                  {content}
                </Link>
              ) : (
                <div className="flex min-w-0 flex-1 items-start gap-3">{content}</div>
              )}
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }

  return context;
}

export function NotificationBell() {
  const { items, unread, markAllRead, markRead, clear } = useNotifications();
  const [open, setOpen] = useState(false);
  const now = useNow(30000);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-semibold text-slate-900">Notifications</p>
            <div className="flex gap-3 text-xs font-medium">
              <button type="button" onClick={markAllRead} className="text-leaf hover:underline">
                Mark all read
              </button>
              <button type="button" onClick={clear} className="text-slate-500 hover:underline">
                Clear
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              Nothing yet. Collector activity and bin alerts appear here as they happen.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {items.map((item) => {
                const { icon: Icon, tone } = kindStyle[item.kind];
                const body = (
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${tone}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${item.read ? "font-medium text-slate-700" : "font-semibold text-slate-900"}`}>
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600">{item.body}</p>
                      <p className="mt-1 text-xs text-slate-400">{timeAgo(item.at, now)}</p>
                    </div>
                    {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-leaf" aria-label="Unread" />}
                  </div>
                );

                return (
                  <li key={item.id}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={() => {
                          markRead(item.id);
                          setOpen(false);
                        }}
                        className="block px-4 py-3 hover:bg-slate-50"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="px-4 py-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
