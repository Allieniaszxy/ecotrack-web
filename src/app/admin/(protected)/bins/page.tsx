"use client";

import { useMemo, useState, type FormEvent } from "react";
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
import { Pencil, Plus, Search, Trash2, TrendingUp } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  Field,
  FillBar,
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
import { formatDateTime, formatTime } from "@/lib/format";
import {
  getBinState,
  type Bin,
  type ListResponse,
  type Reading,
} from "@/lib/types";

const BIN_STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "MAINTENANCE"] as const;

type RealtimeReading = { binId: string; reading: Reading };

function BinForm({
  bin,
  onDone,
  onClose,
}: {
  bin: Bin | null;
  onDone: (message: string) => void;
  onClose: () => void;
}) {
  const { request } = useAdminAuth();
  const editing = bin !== null;
  const [binId, setBinId] = useState(bin?.binId ?? "");
  const [name, setName] = useState(bin?.name ?? "");
  const [location, setLocation] = useState(bin?.location ?? "");
  const [status, setStatus] = useState(bin?.status ?? "ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (editing) {
        await request(`/api/bins/${encodeURIComponent(bin.binId)}`, {
          method: "PATCH",
          body: { name, location, status },
        });
        onDone("Bin updated.");
      } else {
        await request("/api/bins", {
          method: "POST",
          body: { binId: binId.trim(), name, location, status },
        });
        onDone("Bin registered. It will start showing readings once its sensor publishes.");
      }
    } catch (err) {
      setError(errorMessage(err, "Unable to save the bin."));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit bin" : "Add a smart bin"}
      description={
        editing
          ? bin.binId
          : "The Bin ID must match the ID your sensor publishes over MQTT."
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Notice kind="error">{error}</Notice>}

        {!editing && (
          <Field label="Bin ID" hint="Letters, numbers, hyphens and underscores. Example: BIN-LAG-003">
            <input
              required
              value={binId}
              onChange={(e) => setBinId(e.target.value)}
              className={inputClass}
              placeholder="BIN-LAG-003"
              autoFocus
            />
          </Field>
        )}
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Ikeja Market Bin"
          />
        </Field>
        <Field label="Location">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClass}
            placeholder="Allen Avenue, Ikeja"
          />
        </Field>
        <Field
          label="Status"
          hint="Inactive and maintenance bins do not raise fill alerts."
        >
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            {BIN_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0) + option.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {editing ? "Save changes" : "Register bin"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BinHistory({ bin, onClose }: { bin: Bin; onClose: () => void }) {
  const { request } = useAdminAuth();
  const history = useResource(() =>
    request<ListResponse<Reading[]>>(
      `/api/bins/${encodeURIComponent(bin.binId)}/readings?limit=50`,
    ).then((r) => [...r.data].reverse()),
  );

  const data = (history.data ?? []).map((r) => ({
    time: formatTime(r.receivedAt),
    fill: r.fillLevel,
  }));

  return (
    <Modal
      title={bin.name || bin.binId}
      description={`${bin.binId} · ${bin.location || "No location set"}`}
      onClose={onClose}
      wide
    >
      {history.loading ? (
        <PageLoader />
      ) : history.error ? (
        <Notice kind="error">{history.error}</Notice>
      ) : data.length < 2 ? (
        <EmptyState
          icon={TrendingUp}
          title="Not enough readings yet"
          description="A chart appears after this bin has reported at least two measurements."
        />
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, "Fill level"]} />
              <Area type="monotone" dataKey="fill" stroke="#087a45" strokeWidth={2.5} fill="#087a45" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <Link
          href={`/admin/assignments?bin=${encodeURIComponent(bin.binId)}`}
          className="inline-flex items-center rounded-xl bg-leaf px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#066a3b]"
        >
          Assign a collector
        </Link>
      </div>
    </Modal>
  );
}

export default function BinsPage() {
  const { request, hasRole } = useAdminAuth();
  const canManage = hasRole("SUPER_ADMIN", "ADMIN");

  const bins = useResource(
    () => request<ListResponse<Bin[]>>("/api/bins").then((r) => r.data),
    { intervalMs: 30000 },
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [formBin, setFormBin] = useState<Bin | null | undefined>(undefined);
  const [historyBin, setHistoryBin] = useState<Bin | null>(null);
  const [message, setMessage] = useState("");

  const { setData, reload } = bins;

  useRealtimeEvent<RealtimeReading>("bin:reading", (payload) => {
    setData((current) =>
      current
        ? current.map((bin) =>
            bin.binId === payload.binId
              ? { ...bin, latestReading: payload.reading, _count: { readings: bin._count.readings + 1 } }
              : bin,
          )
        : current,
    );
  });

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (bins.data ?? []).filter((bin) => {
      const matchesSearch =
        !query ||
        bin.binId.toLowerCase().includes(query) ||
        (bin.name ?? "").toLowerCase().includes(query) ||
        (bin.location ?? "").toLowerCase().includes(query);

      return matchesSearch && (statusFilter === "ALL" || getBinState(bin) === statusFilter);
    });
  }, [bins.data, search, statusFilter]);

  if (bins.loading) return <PageLoader label="Loading bins…" />;

  return (
    <>
      <PageHeader
        title="Smart bins"
        description="Register bins, keep their details current and review their fill history."
        actions={
          canManage && (
            <Button onClick={() => setFormBin(null)}>
              <Plus size={16} />
              Add bin
            </Button>
          )
        }
      />

      {message && (
        <Notice kind="success" onClose={() => setMessage("")}>
          {message}
        </Notice>
      )}
      {bins.error && <Notice kind="error">{bins.error}</Notice>}

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, name or location"
              aria-label="Search bins"
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className={`${inputClass} sm:w-48`}
          >
            <option value="ALL">All statuses</option>
            {["CRITICAL", "HIGH", "FILLING", "NORMAL", "NO DATA", "MAINTENANCE", "INACTIVE"].map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title={bins.data?.length ? "No bins match your filters" : "No smart bins yet"}
            description={
              bins.data?.length
                ? "Try a different search term or status."
                : "Register a bin to start monitoring it."
            }
            action={
              canManage && !bins.data?.length ? (
                <Button onClick={() => setFormBin(null)}>
                  <Plus size={16} />
                  Add your first bin
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Bin</th>
                  <th className="px-5 py-3 font-semibold">Location</th>
                  <th className="px-5 py-3 font-semibold">Fill level</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Readings</th>
                  <th className="px-5 py-3 font-semibold">Last reading</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((bin) => (
                  <tr key={bin.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{bin.name || bin.binId}</p>
                      <p className="text-xs text-slate-500">{bin.binId}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{bin.location || "—"}</td>
                    <td className="px-5 py-3.5"><FillBar value={bin.latestReading?.fillLevel} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={getBinState(bin)} /></td>
                    <td className="px-5 py-3.5 text-slate-600">{bin._count.readings}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {bin.latestReading ? formatDateTime(bin.latestReading.receivedAt) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setHistoryBin(bin)}>
                          <TrendingUp size={14} />
                          History
                        </Button>
                        {canManage && (
                          <Button size="sm" variant="secondary" onClick={() => setFormBin(bin)} aria-label={`Edit ${bin.name || bin.binId}`}>
                            <Pencil size={14} />
                            Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {formBin !== undefined && (
        <BinForm
          bin={formBin}
          onClose={() => setFormBin(undefined)}
          onDone={(text) => {
            setFormBin(undefined);
            setMessage(text);
            void reload();
          }}
        />
      )}
      {historyBin && <BinHistory bin={historyBin} onClose={() => setHistoryBin(null)} />}
    </>
  );
}

