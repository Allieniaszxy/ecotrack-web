"use client";

import { History } from "lucide-react";
import { Card, EmptyState, Notice, PageHeader, PageLoader, StatusBadge } from "@/components/ui";
import { useCollectorAuth } from "@/context/CollectorAuthContext";
import { useResource } from "@/hooks/useResource";
import { HeartHandshake } from "lucide-react";
import { parseFeedback } from "@/lib/feedback";
import { formatDateTime } from "@/lib/format";
import type { Assignment, ListResponse } from "@/lib/types";

export default function CollectorHistoryPage() {
  const { request } = useCollectorAuth();

  const assignments = useResource(() =>
    request<ListResponse<Assignment[]>>("/api/collector/assignments").then((r) => r.data),
  );

  if (assignments.loading) return <PageLoader label="Loading history…" />;

  const finished = (assignments.data ?? []).filter((a) => ["COMPLETED", "CANCELLED"].includes(a.status));

  return (
    <>
      <PageHeader title="History" description="Collections you have completed and assignments that were cancelled." />

      {assignments.error && <Notice kind="error">{assignments.error}</Notice>}

      <Card>
        {finished.length === 0 ? (
          <EmptyState icon={History} title="No finished assignments yet" description="Completed collections will be listed here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {finished.map((a) => {
              const lastNote = [...a.statusHistory]
                .reverse()
                .find((h) => h.note && !parseFeedback(h.note))?.note;
              const feedback = a.statusHistory
                .map((h) => parseFeedback(h.note))
                .filter((f) => f !== null);
              return (
                <li key={a.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{a.bin.name || a.binId}</p>
                    <p className="text-sm text-slate-500">{a.bin.location || a.binId}</p>
                    {lastNote && <p className="mt-1 text-sm text-slate-600">{lastNote}</p>}
                    {feedback.map((f, index) => (
                      <p key={index} className="mt-2 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        <HeartHandshake size={16} className="mt-0.5 shrink-0" />
                        <span><span className="font-semibold">{f.from}:</span> {f.message}</span>
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>{formatDateTime(a.completedAt ?? a.createdAt)}</span>
                    <StatusBadge status={a.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
