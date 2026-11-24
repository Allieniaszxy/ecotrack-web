"use client";

import { useCallback, useState } from "react";
import { ClipboardList } from "lucide-react";
import { CollectorAssignmentCard } from "@/components/CollectorAssignmentCard";
import { Card, EmptyState, Notice, PageHeader, PageLoader } from "@/components/ui";
import { useCollectorAuth } from "@/context/CollectorAuthContext";
import { useResource } from "@/hooks/useResource";
import { humanize } from "@/lib/format";
import type { Assignment, AssignmentStatus, ListResponse } from "@/lib/types";

const TABS: ("ALL" | AssignmentStatus)[] = ["ALL", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "ISSUE_REPORTED"];

export default function CollectorAssignmentsPage() {
  const { request } = useCollectorAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");

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

  const open = (assignments.data ?? []).filter((a) => !["COMPLETED", "CANCELLED"].includes(a.status));
  const visible = open.filter((a) => tab === "ALL" || a.status === tab);

  return (
    <>
      <PageHeader title="My assignments" description="Accept new pickups, work through them and report problems." />

      {assignments.error && <Notice kind="error">{assignments.error}</Notice>}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {TABS.map((t) => {
          const count = t === "ALL" ? open.length : open.filter((a) => a.status === t).length;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === t ? "bg-forest text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {t === "ALL" ? "All open" : humanize(t)} <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardList} title="Nothing here" description="No assignments match this filter right now." />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {visible.map((a) => (
            <CollectorAssignmentCard key={a.id} assignment={a} onChanged={upsert} />
          ))}
        </div>
      )}
    </>
  );
}
