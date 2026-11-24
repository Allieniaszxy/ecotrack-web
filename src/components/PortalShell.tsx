"use client";

import { useState, type ElementType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, LogOut, Menu, X } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: ElementType;
};

export function PortalShell({
  portalName,
  nav,
  userName,
  userDetail,
  onLogout,
  headerExtra,
  children,
}: {
  portalName: string;
  nav: NavItem[];
  userName: string;
  userDetail: string;
  onLogout: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const current = nav.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <div className="min-h-screen bg-canvas">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-forest text-white transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label={`${portalName} navigation`}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <Link href={nav[0].href} className="flex items-center gap-3">
            <span className="rounded-xl bg-green-400 p-2 text-green-950">
              <Leaf size={20} />
            </span>
            <span>
              <span className="block text-lg font-bold leading-5 tracking-tight">
                EcoTrack
              </span>
              <span className="block text-xs text-green-200/80">
                {portalName}
              </span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-green-100 hover:bg-white/10 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => {
            const active = item === current;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white text-forest"
                    : "text-green-100/90 hover:bg-white/10"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 px-1">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="truncate text-xs text-green-200/80">{userDetail}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold transition hover:bg-white/20"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <p className="text-sm font-semibold text-slate-700">
              {current?.label ?? portalName}
            </p>
          </div>
          <div className="flex items-center gap-3">{headerExtra}</div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
