"use client";

import { Suspense, useCallback, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarClock, ClipboardList, Eye, HeartHandshake, Plus } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  Notice,
  PageHeader,
  PageLoader,
  StatusBadge,
  inputClass,
} from "@/components/ui";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useRealtimeEvent } from "@/context/RealtimeContext";
import { useResource } from "@/hooks/useResource";
import { errorMessage } from "@/lib/api";
import { parseFeedback } from "@/lib/feedback";
import { formatDateTime, humanize, localInputToIso } from "@/lib/format";
import {
  ACTIVE_ASSIGNMENT_STATUSES,
  type Assignment,
  type Bin,
  type Collector,
  type ItemResponse,
  type ListResponse,
  type Priority,
} from "@/lib/types";

const STATUS_FILTERS = ["ALL", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "ISSUE_REPORTED", "COMPLETED", "CANCELLED"];

type FormPrefill = { binId: string; alertId: string };

function CreateAssignmentModal({
  prefill,
  bins,
  collectors,
  assignments,
  onDone,
  onClose,
}: {
  prefill: FormPrefill;
  bins: Bin[];
  collectors: Collector[];
  assignments: Assignment[];
  onDone: (assignment: Assignment) => void;
  onClose: () => void;
}) {
  const { request } = useAdminAuth();
  const [binId, setBinId] = useState(prefill.binId);
  const [collectorId, setCollectorId] = useState("");
  const [priority, setPriority] = useState<Priority>(prefill.alertId ? "HIGH" : "NORMAL");
  const [scheduledFor, setScheduledFor] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const busyBins = new Set(
    assignments.filter((a) => ACTIVE_ASSIGNMENT_STATUSES.includes(a.status)).map((a) => a.binId),
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const result = await request<ItemResponse<Assignment>>("/api/assignments", {
        method: "POST",
        body: {
          binId,
          collectorId,
          priority,
          scheduledFor: localInputToIso(scheduledFor),
          notes,
          ...(prefill.alertId ? { alertId: prefill.alertId } : {}),
        },
      });
      onDone(result.data);
    } catch (err) {
      setError(errorMessage(err, "Unable to create the assignment."));
      setSubmitting(false);
    }
  }

  const activeCollectors = collectors.filter((c) => c.status === "ACTIVE");

  return (
    <Modal title="Assign a collection" description="The collector sees this in their portal straight away." onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Notice kind="error">{error}</Notice>}

        <Field label="Smart bin">
          <select required value={binId} onChange={(e) => setBinId(e.target.value)} className={inputClass}>
            <option value="">Select a bin</option>
            {bins
              .filter((b) => b.status === "ACTIVE")
              .map((bin) => (
                <option key={bin.binId} value={bin.binId} disabled={busyBins.has(bin.binId)}>
                  {bin.name || bin.binId}
                  {bin.latestReading ? ` — ${bin.latestReading.fillLevel.toFixed(0)}% full` : ""}
                  {busyBins.has(bin.binId) ? " (already assigned)" : ""}
                </option>
              ))}
          </select>
        </Field>

        <Field label="Collector" hint={activeCollectors.length === 0 ? "Register an active collector first." : undefined}>
          <select required value={collectorId} onChange={(e) => setCollectorId(e.target.value)} className={inputClass}>
            <option value="">Select a collector</option>
            {activeCollectors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} — {c.phone}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Priority">
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inputClass}>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </Field>
          <Field label="Scheduled for (optional)">
            <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <Field label="Notes for the collector (optional)">
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} maxLength={500} />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting}>Assign collection</Button>
        </div>
      </form>
    </Modal>
  );
}

const QUICK_THANKS = [
  "Great work, thank you!",
  "Thanks for the quick response.",
  "Well done. Keep it up!",
];

function ThankCollector({
  assignment,
  onSent,
}: {
  assignment: Assignment;
  onSent: (assignment: Assignment) => void;
}) {
  const { request } = useAdminAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError("");
    setSent(false);

    try {
      const result = await request<ItemResponse<Assignment>>(
        `/api/assignments/${assignment.id}/feedback`,
        { method: "POST", body: { message } },
      );
      onSent(result.data);
      setMessage("");
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, "Unable to send your message."));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={send} className="mt-6 space-y-3 border-t border-slate-100 pt-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <HeartHandshake size={16} className="text-leaf" />
        Thank {assignment.collector.fullName.split(" ")[0]}
      </h3>
      {error && <Notice kind="error">{error}</Notice>}
      {sent && <Notice kind="success">Sent. They will see it in their portal.</Notice>}
      <div className="flex flex-wrap gap-2">
        {QUICK_THANKS.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => setMessage(text)}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            {text}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={300}
          className={inputClass}
          placeholder="Write a message to the collector"
          aria-label="Message to the collector"
        />
        <Button type="submit" loading={sending} disabled={!message.trim()}>
          Send
        </Button>
      </div>
    </form>
  );
}

function AssignmentDetail({
  assignment,
  onClose,
  onChange,
}: {
  assignment: Assignment;
  onClose: () => void;
  onChange: (assignment: Assignment) => void;
}) {
  const { request } = useAdminAuth();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const actions: { status: string; label: string; variant: "danger" | "primary" | "secondary" }[] =
    assignment.status === "ISSUE_REPORTED"
      ? [
          { status: "IN_PROGRESS", label: "Resume collection", variant: "primary" },
          { status: "CANCELLED", label: "Cancel assignment", variant: "danger" },
        ]
      : assignment.status === "ASSIGNED" || assignment.status === "ACCEPTED"
        ? [{ status: "CANCELLED", label: "Cancel assignment", variant: "danger" }]
        : [];

  async function update(status: string) {
    setBusy(status);
    setError("");

    try {
      const result = await request<ItemResponse<Assignment>>(
        `/api/assignments/${assignment.id}/status`,
        { method: "PATCH", body: { status, note: note.trim() || undefined } },
      );
      onChange(result.data);
      setNote("");
    } catch (err) {
      setError(errorMessage(err, "Unable to update the assignment."));
    } finally {
      setBusy(null);
    }
  }

  const fill = assignment.bin.readings?.[0]?.fillLevel;

  return (
    <Modal
      title={assignment.bin.name || assignment.binId}
      description={`${assignment.binId} · ${assignment.bin.location || "No location set"}`}
      onClose={onClose}
      wide
    >
      <div className="grid gap-6 md:grid-cols-2">
        <dl className="space-y-3 text-sm">
          {[
            ["Status", <StatusBadge key="s" status={assignment.status} />],
            ["Priority", <StatusBadge key="p" status={assignment.priority === "NORMAL" ? "NORMAL" : assignment.priority} />],
            ["Collector", `${assignment.collector.fullName} (${assignment.collector.phone})`],
            ["Scheduled", formatDateTime(assignment.scheduledFor)],
            ["Assigned", formatDateTime(assignment.assignedAt)],
            ["Completed", formatDateTime(assignment.completedAt)],
            ["Latest fill level", fill === undefined ? "—" : `${fill.toFixed(1)}%`],
            ["Notes", assignment.notes || "—"],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between gap-4">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-right font-medium text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">History</h3>
          <ol className="space-y-4 border-l-2 border-slate-100 pl-4">
            {assignment.statusHistory.map((entry) => {
              const feedback = parseFeedback(entry.note);

              return (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-leaf ring-4 ring-white" />
                  <p className="text-sm font-medium text-slate-900">
                    {feedback ? `Thanks sent by ${feedback.from}` : humanize(entry.status)}
                  </p>
                  <p className="text-xs text-slate-500">{formatDateTime(entry.changedAt)}</p>
                  {feedback ? (
                    <p className="mt-1 text-sm italic text-slate-600">“{feedback.message}”</p>
                  ) : (
                    entry.note && <p className="mt-1 text-sm text-slate-600">{entry.note}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {assignment.status === "COMPLETED" && (
        <ThankCollector assignment={assignment} onSent={onChange} />
      )}

      {actions.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          {error && <div className="mb-3"><Notice kind="error">{error}</Notice></div>}
          <Field label="Note (optional)">
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="Reason for the change" />
          </Field>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {actions.map((action) => (
              <Button key={action.status} variant={action.variant} loading={busy === action.status} disabled={busy !== null} onClick={() => update(action.status)}>
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function AssignmentsContent() {
  const { request } = useAdminAuth();
  const params = useSearchParams();

  const assignments = useResource(
    () => request<ListResponse<Assignment[]>>("/api/assignments").then((r) => r.data),
    { intervalMs: 30000 },
  );
  const bins = useResource(() => request<ListResponse<Bin[]>>("/api/bins").then((r) => r.data));
  const collectors = useResource(() => request<ListResponse<Collector[]>>("/api/collectors").then((r) => r.data));

  const [filter, setFilter] = useState("ALL");
  const [prefill, setPrefill] = useState<FormPrefill | null>(() => {
    const binId = params.get("bin");
    return binId ? { binId, alertId: params.get("alert") ?? "" } : null;
  });
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get("open"));
  const [message, setMessage] = useState("");

  const { setData, reload } = assignments;

  const upsert = useCallback(
    (assignment: Assignment) =>
      setData((current) => {
        const list = current ?? [];
        return list.some((a) => a.id === assignment.id)
          ? list.map((a) =>
              a.id === assignment.id
                ? // Live events omit the bin's latest reading; keep the one we have.
                  { ...assignment, bin: { ...a.bin, ...assignment.bin, readings: assignment.bin.readings ?? a.bin.readings } }
                : a,
            )
          : [assignment, ...list];
      }),
    [setData],
  );

  useRealtimeEvent<Assignment>("assignment:updated", upsert);

  const rows = useMemo(
    () => (assignments.data ?? []).filter((a) => filter === "ALL" || a.status === filter),
    [assignments.data, filter],
  );

  if (assignments.loading || bins.loading || collectors.loading) {
    return <PageLoader label="Loading assignments…" />;
  }

  const selected = (assignments.data ?? []).find((a) => a.id === selectedId) ?? null;
  const loadError = assignments.error || bins.error || collectors.error;

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Dispatch collectors to bins and follow each collection from assignment to completion."
        actions={
          <Button onClick={() => setPrefill({ binId: "", alertId: "" })}>
            <Plus size={16} />
            New assignment
          </Button>
        }
      />

      {message && <Notice kind="success" onClose={() => setMessage("")}>{message}</Notice>}
      {loadError && <Notice kind="error">{loadError}</Notice>}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {STATUS_FILTERS.map((status) => {
          const count = status === "ALL" ? assignments.data?.length ?? 0 : (assignments.data ?? []).filter((a) => a.status === status).length;
          return (
            <button
              key={status}
              role="tab"
              aria-selected={filter === status}
              onClick={() => setFilter(status)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filter === status ? "bg-forest text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {status === "ALL" ? "All" : humanize(status)} <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No assignments here"
            description="Create an assignment to send a collector to a bin."
            action={<Button onClick={() => setPrefill({ binId: "", alertId: "" })}><Plus size={16} />New assignment</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Bin</th>
                  <th className="px-5 py-3 font-semibold">Collector</th>
                  <th className="px-5 py-3 font-semibold">Priority</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Scheduled</th>
                  <th className="px-5 py-3 text-right font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{a.bin.name || a.binId}</p>
                      <p className="text-xs text-slate-500">{a.bin.location || a.binId}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">{a.collector.fullName}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={a.priority === "NORMAL" ? "NORMAL" : a.priority} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-3.5 text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><CalendarClock size={14} />{formatDateTime(a.scheduledFor)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedId(a.id)}>
                        <Eye size={14} />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {prefill && (
        <CreateAssignmentModal
          prefill={prefill}
          bins={bins.data ?? []}
          collectors={collectors.data ?? []}
          assignments={assignments.data ?? []}
          onClose={() => setPrefill(null)}
          onDone={(assignment) => {
            upsert(assignment);
            setPrefill(null);
            setMessage(`${assignment.collector.fullName} has been assigned to ${assignment.bin.name || assignment.binId}.`);
            void reload();
          }}
        />
      )}

      {selected && <AssignmentDetail assignment={selected} onClose={() => setSelectedId(null)} onChange={upsert} />}
    </>
  );
}

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading assignments…" />}>
      <AssignmentsContent />
    </Suspense>
  );
}
