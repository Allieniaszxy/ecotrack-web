"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, History, LayoutDashboard, UserRound } from "lucide-react";
import { PortalShell, type NavItem } from "@/components/PortalShell";
import { FullScreenLoader } from "@/components/ui";
import { useCollectorAuth } from "@/context/CollectorAuthContext";

const nav: NavItem[] = [
  { label: "Dashboard", href: "/collector/dashboard", icon: LayoutDashboard },
  { label: "My assignments", href: "/collector/assignments", icon: ClipboardCheck },
  { label: "History", href: "/collector/history", icon: History },
  { label: "Profile", href: "/collector/profile", icon: UserRound },
];

export default function ProtectedCollectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { collector, status, logout } = useCollectorAuth();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/collector/login");
  }, [status, router]);

  if (status !== "authenticated" || !collector) return <FullScreenLoader />;

  return (
    <PortalShell
      portalName="Collector portal"
      nav={nav}
      userName={collector.fullName}
      userDetail={collector.email || collector.phone}
      onLogout={logout}
    >
      {children}
    </PortalShell>
  );
}
