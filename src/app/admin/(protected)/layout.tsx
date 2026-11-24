"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BellRing,
  ClipboardList,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Wifi, WifiOff } from "lucide-react";
import { PortalShell, type NavItem } from "@/components/PortalShell";
import { FullScreenLoader } from "@/components/ui";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  NotificationBell,
  NotificationProvider,
} from "@/context/NotificationContext";
import {
  RealtimeProvider,
  useRealtimeStatus,
} from "@/context/RealtimeContext";
import { humanize } from "@/lib/format";

const baseNav: NavItem[] = [
  { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Smart bins", href: "/admin/bins", icon: Trash2 },
  { label: "Alerts", href: "/admin/alerts", icon: BellRing },
  { label: "Collectors", href: "/admin/collectors", icon: Users },
  { label: "Assignments", href: "/admin/assignments", icon: ClipboardList },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

function LiveBadge() {
  const connected = useRealtimeStatus();

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
        connected
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
      role="status"
    >
      {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
      {connected ? "Live" : "Reconnecting…"}
    </span>
  );
}

export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { admin, token, status, logout } = useAdminAuth();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/admin/login");
  }, [status, router]);

  if (status !== "authenticated" || !admin || !token) {
    return <FullScreenLoader />;
  }

  const nav: NavItem[] = [
    ...baseNav,
    ...(admin.role === "SUPER_ADMIN"
      ? [{ label: "Admin team", href: "/admin/team", icon: ShieldCheck }]
      : []),
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <RealtimeProvider token={token} onAuthError={logout}>
      <NotificationProvider>
        <PortalShell
          portalName="Admin portal"
          nav={nav}
          userName={admin.fullName}
          userDetail={humanize(admin.role)}
          onLogout={logout}
          headerExtra={
            <>
              <NotificationBell />
              <LiveBadge />
            </>
          }
        >
          {children}
        </PortalShell>
      </NotificationProvider>
    </RealtimeProvider>
  );
}

