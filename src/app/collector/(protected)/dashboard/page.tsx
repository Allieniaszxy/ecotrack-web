"use client";

import { useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, HeartHandshake, Hourglass, Truck } from "lucide-react";
import { parseFeedback } from "@/lib/feedback";
import { formatDateTime } from "@/lib/format";
import { CollectorAssignmentCard } from "@/components/CollectorAssignmentCard";
import { Card, EmptyState, Notice, PageHeader, PageLoader, StatCard } from "@/components/ui";
import { useCollectorAuth } from "@/context/CollectorAuthContext";
import { useResource } from "@/hooks/useResource";
import { ACTIVE_ASSIGNMENT_STATUSES, type Assignment, type ListResponse } from "@/lib/types";

const PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, NORMAL: 2 } as const;

export default function CollectorDashboardPage() {
  const { collector, request } = useCollectorAuth();

  const assignments = useResource(
    () => request<ListResponse<Assignment[]>>("/api/collector/assignments").then((r) => r.data),
    { intervalMs: 20000 },
  );

  const { setData } = assignments;

  const upsert = useCallback(
    (assignment: Assignment) =>
      setData((current) => (current ?? []).map((a) => (a.id === assignment.id ? assignment : a))),
    [setData],
  );

  if (assignments.loading) return <PageLoader label="Loading your assignments…" />;

  const all = assignments.data ?? [];
  const active = all
    .filter((a) => ACTIVE_ASSIGNMENT_STATUSES.includes(a.status))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const count = (status: string) => all.filter((a) => a.status === status).length;
  const firstName = collector?.fullName.split(" ")[0] ?? "";

  // Most recent messages from the admin team, newest first.
  const messages = all
    .flatMap((a) =>
      a.statusHistory.flatMap((h) => {
        const feedback = parseFeedback(h.note);
        return feedback ? [{ id: h.id, at: h.changedAt, bin: a.bin.name || a.binId, ...feedback }] : [];
      }),
    )
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 3);

  return (
    <>
      <PageHeader
        title={`Hello, ${firstName}`}
        description="Here is what needs collecting. The most urgent bins are listed first."
      />

      {assignments.error && <Notice kind="error">{assignments.error}</Notice>}

      {messages.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/60 p-5">
          <h2 className="flex items-center gap-2 font-bold text-emerald-900">
            <HeartHandshake size={18} />
            Well done
          </h2>
          <ul className="mt-3 space-y-3">
            {messages.map((m) => (
              <li key={m.id} className="text-sm text-emerald-900">
                <span className="font-semibold">{m.from}</span> on {m.bin}: “{m.message}”
                <span className="ml-2 text-xs text-emerald-700">{formatDateTime(m.at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Waiting for you" value={count("ASSIGNED")} note="Accept these to get started" icon={Hourglass} tone="bg-blue-50 text-blue-700" />
        <StatCard title="In progress" value={count("IN_PROGRESS") + count("ACCEPTED")} note="Accepted or being collected" icon={Truck} tone="bg-amber-50 text-amber-700" />
        <StatCard title="Collected" value={count("COMPLETED")} note="All time" icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Active assignments</h2>
        <Link href="/collector/history" className="text-sm font-medium text-leaf hover:underline">View history</Link>
      </div>

      {active.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No active assignments"
            description="You are all caught up. New assignments appear here automatically."
          />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {active.map((a) => (
            <CollectorAssignmentCard key={a.id} assignment={a} onChanged={upsert} />
          ))}
        </div>
      )}
    </>
  );
}
