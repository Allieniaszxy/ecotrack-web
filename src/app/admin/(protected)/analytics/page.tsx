"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Trophy } from "lucide-react";
import {
  Card,
  EmptyState,
  FillBar,
  Notice,
  PageHeader,
  PageLoader,
  StatusBadge,
  inputClass,
} from "@/components/ui";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useResource } from "@/hooks/useResource";
import {
  getBinState,
  type AnalyticsData,
  type Bin,
  type ItemResponse,
  type ListResponse,
} from "@/lib/types";

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short" }).format(new Date(value));

export default function AnalyticsPage() {
  const { request } = useAdminAuth();
  const [days, setDays] = useState(14);

  const analytics = useResource(
    () => request<ItemResponse<AnalyticsData>>(`/api/stats/analytics?days=${days}`).then((r) => r.data),
    { key: days },
  );
  const bins = useResource(() => request<ListResponse<Bin[]>>("/api/bins").then((r) => r.data));

  if (analytics.loading || bins.loading) return <PageLoader label="Loading analytics…" />;

  const daily = (analytics.data?.daily ?? []).map((d) => ({ ...d, label: shortDate(d.date) }));
  const totalCollections = daily.reduce((sum, d) => sum + d.collections, 0);
  const totalAlerts = daily.reduce((sum, d) => sum + d.alerts, 0);
  const top = analytics.data?.topCollectors ?? [];
  const fullest = [...(bins.data ?? [])]
    .filter((b) => b.latestReading)
    .sort((a, b) => (b.latestReading?.fillLevel ?? 0) - (a.latestReading?.fillLevel ?? 0))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Collection performance and alert volume over time."
        actions={
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Date range"
            className={`${inputClass} w-auto`}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        }
      />

      {(analytics.error || bins.error) && <Notice kind="error">{analytics.error || bins.error}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-slate-500">Collections completed</p>
          <p className="mt-1 text-3xl font-bold">{totalCollections}</p>
          <p className="mt-1 text-xs text-slate-500">in the last {analytics.data?.days ?? days} days</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Alerts raised</p>
          <p className="mt-1 text-3xl font-bold">{totalAlerts}</p>
          <p className="mt-1 text-xs text-slate-500">in the last {analytics.data?.days ?? days} days</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="mb-5 font-bold text-slate-900">Collections per day</h2>
          {totalCollections === 0 ? (
            <EmptyState icon={BarChart3} title="No completed collections yet" description="Completed pickups will be charted here." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="collections" name="Collections" fill="#087a45" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-5 font-bold text-slate-900">Alerts per day</h2>
          {totalAlerts === 0 ? (
            <EmptyState icon={BarChart3} title="No alerts in this period" description="Fill alerts will be charted here." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="alerts" name="Alerts" stroke="#dc2626" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="border-b border-slate-100 px-5 py-4 font-bold text-slate-900">Top collectors</h2>
          {top.length === 0 ? (
            <EmptyState icon={Trophy} title="No completed collections yet" description="The collectors with the most completed pickups appear here." />
          ) : (
            <ol className="divide-y divide-slate-100">
              {top.map((c, index) => (
                <li key={c.collectorId} className="flex items-center justify-between px-5 py-3.5">
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{index + 1}</span>
                    <span className="font-medium text-slate-900">{c.fullName}</span>
                  </span>
                  <span className="text-sm text-slate-600">{c.completed} completed</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <h2 className="border-b border-slate-100 px-5 py-4 font-bold text-slate-900">Fullest bins right now</h2>
          {fullest.length === 0 ? (
            <EmptyState icon={BarChart3} title="No readings yet" description="Bins appear here once their sensors report." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {fullest.map((bin) => (
                <li key={bin.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{bin.name || bin.binId}</p>
                    <StatusBadge status={getBinState(bin)} />
                  </div>
                  <FillBar value={bin.latestReading?.fillLevel} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
