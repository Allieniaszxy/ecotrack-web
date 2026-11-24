"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { BellRing, CheckCheck } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
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
import { formatDateTime } from "@/lib/format";
import type { BinAlert, ItemResponse, ListResponse } from "@/lib/types";

const FILTERS = [
  ["OPEN", "Open"],
  ["ACTIVE", "New"],
  ["ACKNOWLEDGED", "Acknowledged"],
  ["RESOLVED", "Resolved"],
  ["CRITICAL", "Critical"],
  ["ALL", "All"],
] as const;

export default function AlertsPage() {
  const { request } = useAdminAuth();
  const [filter, setFilter] = useState<string>("OPEN");
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const alerts = useResource(
    () =>
      request<ListResponse<BinAlert[]>>("/api/alerts?limit=100").then(
        (r) => r.data,
      ),
    { intervalMs: 30000 },
  );

  const { setData } = alerts;

  const upsert = useCallback(
    (alert: BinAlert) =>
      setData((current) => {
        const list = current ?? [];
        return list.some((a) => a.id === alert.id)
          ? list.map((a) => (a.id === alert.id ? alert : a))
          : [alert, ...list];
      }),
    [setData],
  );

  useRealtimeEvent<BinAlert>("bin:alert", upsert);
  useRealtimeEvent<BinAlert>("alert:updated", upsert);

  async function change(id: string, action: "acknowledge" | "resolve") {
    setActionId(id);
    setError("");

    try {
      const result = await request<ItemResponse<BinAlert>>(
        `/api/alerts/${id}/${action}`,
        { method: "PATCH" },
      );
      upsert(result.data);
    } catch (err) {
      setError(errorMessage(err, `Unable to ${action} alert.`));
    } finally {
      setActionId(null);
    }
  }

  if (alerts.loading) return <PageLoader label="Loading alerts…" />;

  const visible = (alerts.data ?? []).filter((alert) => {
    switch (filter) {
      case "OPEN":
        return alert.status !== "RESOLVED";
      case "CRITICAL":
        return alert.severity === "CRITICAL";
      case "ALL":
        return true;
      default:
        return alert.status === filter;
    }
  });

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Bins raise a high alert at 75% full and a critical alert at 90%. Completing a collection resolves the alerts for that bin."
        actions={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter alerts"
            className={`${inputClass} w-auto`}
          >
            {FILTERS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        }
      />

      {(error || alerts.error) && <Notice kind="error">{error || alerts.error}</Notice>}

      <Card>
        {visible.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title="No alerts to show"
            description="Nothing matches this filter. Bins below 75% full do not raise alerts."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {alert.bin.name || alert.bin.binId}
                    </p>
                    <StatusBadge status={alert.severity} />
                    <StatusBadge status={alert.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{alert.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {alert.bin.location || alert.binId} · raised{" "}
                    {formatDateTime(alert.createdAt)}
                    {alert.resolvedAt && ` · resolved ${formatDateTime(alert.resolvedAt)}`}
                  </p>
                </div>

                {alert.status !== "RESOLVED" && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {alert.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={actionId === alert.id}
                        onClick={() => change(alert.id, "acknowledge")}
                      >
                        Acknowledge
                      </Button>
                    )}
                    <Link
                      href={`/admin/assignments?bin=${encodeURIComponent(alert.binId)}&alert=${alert.id}`}
                      className="inline-flex items-center rounded-xl bg-leaf px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#066a3b]"
                    >
                      Assign collector
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={actionId === alert.id}
                      onClick={() => change(alert.id, "resolve")}
                    >
                      <CheckCheck size={14} />
                      Resolve
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
