"use client";

import { useMemo, useState, type FormEvent } from "react";
import { KeyRound, Mail, MapPin, Pencil, Phone, Plus, Search, Users, Wand2 } from "lucide-react";
import {
  Button,
  Card,
  ConfirmDialog,
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
import { useResource } from "@/hooks/useResource";
import { errorMessage } from "@/lib/api";
import type { Collector, ListResponse } from "@/lib/types";

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function CollectorForm({
  collector,
  onDone,
  onClose,
}: {
  collector: Collector | null;
  onDone: (message: string) => void;
  onClose: () => void;
}) {
  const { request } = useAdminAuth();
  const editing = collector !== null;
  const [fullName, setFullName] = useState(collector?.fullName ?? "");
  const [email, setEmail] = useState(collector?.email ?? "");
  const [phone, setPhone] = useState(collector?.phone ?? "");
  const [address, setAddress] = useState(collector?.address ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!editing && password.length < 8) {
      setError("Set a password of at least 8 characters so the collector can sign in.");
      return;
    }

    if (editing && password && password.length < 8) {
      setError("A new password must contain at least 8 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const body = {
        fullName,
        email: email.trim() || null,
        phone,
        address: address.trim() || null,
        ...(password ? { password } : {}),
      };

      if (editing) {
        await request(`/api/collectors/${collector.id}`, { method: "PATCH", body });
        onDone("Collector updated.");
      } else {
        await request("/api/collectors", { method: "POST", body });
        onDone("Collector registered. Share their password with them securely.");
      }
    } catch (err) {
      setError(errorMessage(err, "Unable to save the collector."));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit collector" : "Register a collector"}
      description={
        editing
          ? "Leave the password blank to keep the current one."
          : "Collectors sign in with their email or phone number and this password."
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Notice kind="error">{error}</Notice>}

        <Field label="Full name">
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone number">
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} inputMode="tel" placeholder="08012345678" />
          </Field>
          <Field label="Email (optional)">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Address (optional)">
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </Field>
        <Field label={editing ? "New password (optional)" : "Password"} hint="At least 8 characters.">
          <div className="flex gap-2">
            <input
              type="text"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder={editing ? "Leave blank to keep current" : ""}
            />
            <Button type="button" variant="secondary" onClick={() => setPassword(generatePassword())}>
              <Wand2 size={16} />
              Generate
            </Button>
          </div>
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {editing ? "Save changes" : "Register collector"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CollectorsPage() {
  const { request, hasRole } = useAdminAuth();
  const canManage = hasRole("SUPER_ADMIN", "ADMIN");

  const collectors = useResource(() =>
    request<ListResponse<Collector[]>>("/api/collectors").then((r) => r.data),
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [form, setForm] = useState<Collector | null | undefined>(undefined);
  const [toggle, setToggle] = useState<Collector | null>(null);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { reload } = collectors;

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (collectors.data ?? []).filter((c) => {
      const matches =
        !query ||
        c.fullName.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.email ?? "").toLowerCase().includes(query);

      return matches && (statusFilter === "ALL" || c.status === statusFilter);
    });
  }, [collectors.data, search, statusFilter]);

  async function confirmToggle() {
    if (!toggle) return;
    const next = toggle.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setToggling(true);
    setError("");

    try {
      await request(`/api/collectors/${toggle.id}/status`, {
        method: "PATCH",
        body: { status: next },
      });
      setMessage(`${toggle.fullName} is now ${next.toLowerCase()}.`);
      setToggle(null);
      await reload();
    } catch (err) {
      setError(errorMessage(err, "Unable to change the collector's status."));
      setToggle(null);
    } finally {
      setToggling(false);
    }
  }

  if (collectors.loading) return <PageLoader label="Loading collectors…" />;

  const active = (collectors.data ?? []).filter((c) => c.status === "ACTIVE").length;

  return (
    <>
      <PageHeader
        title="Collectors"
        description={`${collectors.data?.length ?? 0} registered · ${active} active. Inactive collectors cannot sign in or receive assignments.`}
        actions={
          canManage && (
            <Button onClick={() => setForm(null)}>
              <Plus size={16} />
              Register collector
            </Button>
          )
        }
      />

      {message && <Notice kind="success" onClose={() => setMessage("")}>{message}</Notice>}
      {(error || collectors.error) && <Notice kind="error" onClose={() => setError("")}>{error || collectors.error}</Notice>}

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or email"
              aria-label="Search collectors"
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className={`${inputClass} sm:w-44`}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={collectors.data?.length ? "No collectors match your search" : "No collectors yet"}
            description={
              collectors.data?.length
                ? "Try a different name, phone number or status."
                : "Register a collector so you can assign them bins."
            }
            action={
              canManage && !collectors.data?.length ? (
                <Button onClick={() => setForm(null)}>
                  <Plus size={16} />
                  Register your first collector
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{c.fullName}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Phone size={14} />{c.phone}</span>
                    {c.email && <span className="inline-flex items-center gap-1.5"><Mail size={14} />{c.email}</span>}
                    {c.address && <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{c.address}</span>}
                    <span>{c._count?.assignments ?? 0} assignments</span>
                  </div>
                </div>

                {canManage && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setForm(c)}>
                      <Pencil size={14} />
                      Edit
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setForm(c)} aria-label={`Reset password for ${c.fullName}`}>
                      <KeyRound size={14} />
                      Password
                    </Button>
                    <Button
                      size="sm"
                      variant={c.status === "ACTIVE" ? "danger" : "primary"}
                      onClick={() => setToggle(c)}
                    >
                      {c.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {form !== undefined && (
        <CollectorForm
          collector={form}
          onClose={() => setForm(undefined)}
          onDone={(text) => {
            setForm(undefined);
            setMessage(text);
            void reload();
          }}
        />
      )}

      {toggle && (
        <ConfirmDialog
          title={toggle.status === "ACTIVE" ? "Deactivate collector?" : "Activate collector?"}
          message={
            toggle.status === "ACTIVE"
              ? `${toggle.fullName} will be signed out immediately and cannot receive new assignments.`
              : `${toggle.fullName} will be able to sign in and receive assignments again.`
          }
          confirmLabel={toggle.status === "ACTIVE" ? "Deactivate" : "Activate"}
          danger={toggle.status === "ACTIVE"}
          loading={toggling}
          onConfirm={confirmToggle}
          onCancel={() => setToggle(null)}
        />
      )}
    </>
  );
}
