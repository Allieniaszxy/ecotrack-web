"use client";

import { useState } from "react";
import { CalendarClock, MapPin, StickyNote } from "lucide-react";
import {
  Button,
  Card,
  Field,
  FillBar,
  Modal,
  Notice,
  StatusBadge,
  inputClass,
} from "@/components/ui";
import { useCollectorAuth } from "@/context/CollectorAuthContext";
import { errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Assignment, AssignmentStatus, ItemResponse } from "@/lib/types";

type Action = {
  status: AssignmentStatus;
  label: string;
  variant: "primary" | "secondary" | "danger";
  noteRequired?: boolean;
  noteLabel?: string;
};

// Mirrors the server's collectorTransitions table in api.js.
const ACTIONS: Partial<Record<AssignmentStatus, Action[]>> = {
  ASSIGNED: [{ status: "ACCEPTED", label: "Accept assignment", variant: "primary" }],
  ACCEPTED: [
    { status: "IN_PROGRESS", label: "Start collection", variant: "primary" },
    { status: "ISSUE_REPORTED", label: "Report an issue", variant: "secondary", noteRequired: true, noteLabel: "What is the problem?" },
  ],
  IN_PROGRESS: [
    { status: "COMPLETED", label: "Mark as collected", variant: "primary", noteLabel: "Note (optional)" },
    { status: "ISSUE_REPORTED", label: "Report an issue", variant: "secondary", noteRequired: true, noteLabel: "What is the problem?" },
  ],
  ISSUE_REPORTED: [{ status: "IN_PROGRESS", label: "Resume collection", variant: "primary" }],
};

export function CollectorAssignmentCard({
  assignment,
  onChanged,
}: {
  assignment: Assignment;
  onChanged: (assignment: Assignment) => void;
}) {
  const { request } = useCollectorAuth();
  const [pending, setPending] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const actions = ACTIONS[assignment.status] ?? [];
  const fill = assignment.bin.readings?.[0]?.fillLevel;

  async function submit(action: Action, text: string) {
    setBusy(true);
    setError("");

    try {
      const result = await request<ItemResponse<Assignment>>(
        `/api/collector/assignments/${assignment.id}/status`,
        { method: "PATCH", body: { status: action.status, note: text.trim() || undefined } },
      );
      onChanged(result.data);
      setPending(null);
      setNote("");
    } catch (err) {
      setError(errorMessage(err, "Unable to update this assignment."));
    } finally {
      setBusy(false);
    }
  }

  function start(action: Action) {
    setError("");
    if (action.noteLabel) {
      setPending(action);
    } else {
      void submit(action, "");
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{assignment.bin.name || assignment.binId}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin size={14} />
            {assignment.bin.location || "No location provided"}
          </p>
        </div>
        <div className="flex gap-2">
          {assignment.priority !== "NORMAL" && <StatusBadge status={assignment.priority} />}
          <StatusBadge status={assignment.status} />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <p className="mb-2 text-xs font-medium text-slate-500">Bin fill level</p>
        <FillBar value={fill} />
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-slate-600">
        {assignment.scheduledFor && (
          <p className="flex items-center gap-2"><CalendarClock size={15} className="text-slate-400" />Scheduled {formatDateTime(assignment.scheduledFor)}</p>
        )}
        {assignment.notes && (
          <p className="flex items-start gap-2"><StickyNote size={15} className="mt-0.5 text-slate-400" />{assignment.notes}</p>
        )}
      </div>

      {error && !pending && <div className="mt-4"><Notice kind="error">{error}</Notice></div>}

      {actions.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button key={action.status} variant={action.variant} loading={busy && !pending} disabled={busy} onClick={() => start(action)}>
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {pending && (
        <Modal title={pending.label} description={assignment.bin.name || assignment.binId} onClose={() => setPending(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit(pending, note);
            }}
            className="space-y-4"
          >
            {error && <Notice kind="error">{error}</Notice>}
            <Field label={pending.noteLabel ?? "Note"}>
              <textarea
                rows={3}
                required={pending.noteRequired}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inputClass}
                maxLength={500}
                autoFocus
              />
            </Field>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setPending(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>Confirm</Button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
