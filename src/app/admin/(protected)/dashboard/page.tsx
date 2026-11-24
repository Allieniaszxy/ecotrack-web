"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BellRing,
  ClipboardList,
  RefreshCw,
  Trash2,
  Truck,
} from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  FillBar,
  Notice,
  PageHeader,
  PageLoader,
  StatCard,
  StatusBadge,
  inputClass,
} from "@/components/ui";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useRealtimeEvent } from "@/context/RealtimeContext";
import { useResource } from "@/hooks/useResource";
import { errorMessage } from "@/lib/api";
import { useNow } from "@/hooks/useNow";
import { formatDateTime, formatTime, timeAgo } from "@/lib/format";
import {
  SENSOR_OFFLINE_AFTER_MS,
  getBinState,
  type Bin,
  type BinAlert,
  type ItemResponse,
  type ListResponse,
  type OverviewStats,
  type Reading,
} from "@/lib/types";

type RealtimeReading = {
  binId: string;
  name: string | null;
  status: string;
  reading: Reading;
};

function LiveBinTile({ bin }: { bin: Bin }) {
  const now = useNow(1000);
  const reading = bin.latestReading;
  const ageMs = reading ? now - new Date(reading.receivedAt).getTime() : null;
  const offline = ageMs !== null && ageMs > SENSOR_OFFLINE_AFTER_MS;
  const fresh = ageMs !== null && ageMs < 10000;
  const state = offline ? "OFFLINE" : getBinState(bin);

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        state === "CRITICAL"
          ? "border-red-200 bg-red-50/40"
          : state === "HIGH"
            ? "border-amber-200 bg-amber-50/40"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{bin.name || bin.binId}</p>
          <p className="truncate text-xs text-slate-500">{bin.location || bin.binId}</p>
        </div>
        <StatusBadge status={state} />
      </div>

      <p className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
        {reading ? `${reading.fillLevel.toFixed(0)}%` : "—"}
      </p>
      <div className="mt-2">
        <FillBar value={reading?.fillLevel} />
      </div>

      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        {fresh && (
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
        {reading ? `Updated ${timeAgo(reading.receivedAt, now)}` : "Waiting for the first reading"}
        {offline && " · sensor not reporting"}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { request } = useAdminAuth();
  const [selectedBinId, setSelectedBinId] = useState("");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const bins = useResource(
    () => request<ListResponse<Bin[]>>("/api/bins").then((r) => r.data),
    { intervalMs: 30000 },
  );
  const stats = useResource(
    () =>
      request<ItemResponse<OverviewStats>>("/api/stats/overview").then(
        (r) => r.data,
      ),
    { intervalMs: 30000 },
  );
  const alerts = useResource(
    () =>
      request<ListResponse<BinAlert[]>>("/api/alerts?limit=100").then(
        (r) => r.data,
      ),
    { intervalMs: 30000 },
  );

  const binList = bins.data;
  const effectiveBinId = selectedBinId || binList?.[0]?.binId || "";

  // Load the sensor history for the chart whenever the selected bin changes.
  useEffect(() => {
    if (!effectiveBinId) return;

    let cancelled = false;

    request<ListResponse<Reading[]>>(
      `/api/bins/${encodeURIComponent(effectiveBinId)}/readings?limit=30`,
    )
      .then((result) => {
        if (!cancelled) setReadings([...result.data].reverse());
      })
      .catch(() => {
        if (!cancelled) setReadings([]);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveBinId, request]);

  const { setData: setBins, reload: reloadBins } = bins;
  const { setData: setAlerts, reload: reloadAlerts } = alerts;
  const { reload: reloadStats } = stats;

  useRealtimeEvent<RealtimeReading>("bin:reading", (payload) => {
    const known = binList?.some((bin) => bin.binId === payload.binId);

    if (!known) {
      void reloadBins();
    } else {
      setBins((current) =>
        current
          ? current.map((bin) =>
              bin.binId === payload.binId
                ? {
                    ...bin,
                    latestReading: payload.reading,
                    _count: { readings: bin._count.readings + 1 },
                  }
                : bin,
            )
          : current,
      );
    }

    if (payload.binId === effectiveBinId) {
      setReadings((current) =>
        [
          ...current.filter((r) => r.id !== payload.reading.id),
          payload.reading,
        ].slice(-30),
      );
    }
  });

  const upsertAlert = useCallback(
    (alert: BinAlert) => {
      setAlerts((current) => {
        const list = current ?? [];
        return list.some((a) => a.id === alert.id)
          ? list.map((a) => (a.id === alert.id ? alert : a))
          : [alert, ...list];
      });
      void reloadStats();
    },
    [setAlerts, reloadStats],
  );

  useRealtimeEvent<BinAlert>("bin:alert", upsertAlert);
  useRealtimeEvent<BinAlert>("alert:updated", upsertAlert);

  async function changeAlert(id: string, action: "acknowledge" | "resolve") {
    setActionId(id);
    setActionError("");

    try {
      const result = await request<ItemResponse<BinAlert>>(
        `/api/alerts/${id}/${action}`,
        { method: "PATCH" },
      );
      upsertAlert(result.data);
    } catch (err) {
      setActionError(errorMessage(err, `Unable to ${action} alert.`));
    } finally {
      setActionId(null);
    }
  }

  async function refreshAll() {
    setRefreshing(true);
    await Promise.all([reloadBins(), reloadAlerts(), reloadStats()]);
    setRefreshing(false);
  }

  if (bins.loading || stats.loading) {
    return <PageLoader label="Loading dashboard…" />;
  }

  const binRows = binList ?? [];
  const overview = stats.data;
  const openAlerts = (alerts.data ?? []).filter((a) => a.status !== "RESOLVED");
  const selectedBin = binRows.find((b) => b.binId === effectiveBinId);
  const averageFill = binRows.length
    ? binRows.reduce((sum, b) => sum + (b.latestReading?.fillLevel ?? 0), 0) /
      binRows.length
    : 0;
  const loadError = bins.error || stats.error || alerts.error;

  const chartData = readings.map((r) => ({
    time: formatTime(r.receivedAt),
    fill: r.fillLevel,
  }));

  return (
    <>
      <PageHeader
        title="Operations overview"
        description="Live fill levels, open alerts and collection activity across your network."
        actions={
          <Button variant="secondary" onClick={refreshAll} loading={refreshing}>
            {!refreshing && <RefreshCw size={16} />}
            Refresh
          </Button>
        }
      />

      {loadError && <Notice kind="error">{loadError}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Smart bins"
          value={overview?.totalBins ?? binRows.length}
          note={`${overview?.activeBins ?? 0} active`}
          icon={Trash2}
          tone="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          title="Average fill level"
          value={`${averageFill.toFixed(0)}%`}
          note="Across all bins"
          icon={RefreshCw}
          tone="bg-blue-50 text-blue-700"
        />
        <StatCard
          title="Open alerts"
          value={overview?.openAlerts ?? openAlerts.length}
          note={`${overview?.criticalAlerts ?? 0} critical and unacknowledged`}
          icon={AlertTriangle}
          tone="bg-red-50 text-red-700"
        />
        <StatCard
          title="Collections underway"
          value={
            (overview?.assignments.IN_PROGRESS ?? 0) +
            (overview?.assignments.ACCEPTED ?? 0) +
            (overview?.assignments.ASSIGNED ?? 0)
          }
          note={`${overview?.activeCollectors ?? 0} active collectors`}
          icon={Truck}
          tone="bg-amber-50 text-amber-700"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Fill level history</h2>
              <p className="text-sm text-slate-500">
                {selectedBin
                  ? `${selectedBin.name || selectedBin.binId} · last ${chartData.length} readings`
                  : "Select a bin"}
              </p>
            </div>
            {binRows.length > 0 && (
              <select
                aria-label="Select bin"
                value={effectiveBinId}
                onChange={(e) => {
                  setSelectedBinId(e.target.value);
                  setReadings([]);
                }}
                className={`${inputClass} w-auto min-w-48`}
              >
                {binRows.map((bin) => (
                  <option key={bin.binId} value={bin.binId}>
                    {bin.name || bin.binId}
                  </option>
                ))}
              </select>
            )}
          </div>

          {chartData.length > 1 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#087a45" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#087a45" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                    unit="%"
                  />
                  <Tooltip
                    formatter={(v) => [`${Number(v).toFixed(1)}%`, "Fill level"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="fill"
                    stroke="#087a45"
                    strokeWidth={2.5}
                    fill="url(#fillGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={RefreshCw}
              title="Waiting for sensor data"
              description="Readings appear here once the selected bin has reported at least two measurements."
            />
          )}
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-900">Open alerts</h2>
            <Link
              href="/admin/alerts"
              className="text-sm font-medium text-leaf hover:underline"
            >
              View all
            </Link>
          </div>

          {actionError && (
            <div className="px-5 pt-4">
              <Notice kind="error" onClose={() => setActionError("")}>
                {actionError}
              </Notice>
            </div>
          )}

          {openAlerts.length === 0 ? (
            <EmptyState
              icon={BellRing}
              title="No open alerts"
              description="Every bin is below the 75% warning level."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {openAlerts.slice(0, 5).map((alert) => (
                <li key={alert.id} className="space-y-2 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {alert.bin.name || alert.bin.binId}
                      </p>
                      <p className="text-xs text-slate-500">
                        {alert.fillLevel.toFixed(1)}% full ·{" "}
                        {formatDateTime(alert.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={alert.severity} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {alert.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={actionId === alert.id}
                        onClick={() => changeAlert(alert.id, "acknowledge")}
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
                      onClick={() => changeAlert(alert.id, "resolve")}
                    >
                      Resolve
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Live bins</h2>
            <p className="text-xs text-slate-500">
              Each tile updates the moment its sensor reports.
            </p>
          </div>
          <Link
            href="/admin/bins"
            className="text-sm font-medium text-leaf hover:underline"
          >
            Manage bins
          </Link>
        </div>
        {binRows.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title="No smart bins yet"
            description="Register your first bin to start receiving sensor readings."
            action={
              <Link
                href="/admin/bins"
                className="inline-flex items-center rounded-xl bg-leaf px-4 py-2.5 text-sm font-semibold text-white"
              >
                Add a bin
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {binRows.slice(0, 12).map((bin) => (
              <LiveBinTile key={bin.id} bin={bin} />
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ["Awaiting acceptance", "ASSIGNED"],
            ["Completed collections", "COMPLETED"],
            ["Issues reported", "ISSUE_REPORTED"],
          ] as const
        ).map(([label, key]) => (
          <Link
            key={key}
            href="/admin/assignments"
            className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-leaf/40"
          >
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {overview?.assignments[key] ?? 0}
              </p>
            </div>
            <ClipboardList className="text-slate-300" />
          </Link>
        ))}
      </div>
    </>
  );
}
