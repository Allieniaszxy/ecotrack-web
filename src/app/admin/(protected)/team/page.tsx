"use client";

import { useState, type FormEvent } from "react";
import { Plus, ShieldCheck } from "lucide-react";
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
import { useResource } from "@/hooks/useResource";
import { errorMessage } from "@/lib/api";
import { formatDate, humanize } from "@/lib/format";
import type { Admin, AdminRole, ListResponse } from "@/lib/types";

const ROLES: AdminRole[] = ["SUPER_ADMIN", "ADMIN", "OPERATIONS_MANAGER"];

const ROLE_HELP: Record<AdminRole, string> = {
  SUPER_ADMIN: "Full access, including managing other administrators.",
  ADMIN: "Manages bins, collectors, assignments and alerts.",
  OPERATIONS_MANAGER: "Views bins and collectors; handles alerts and assignments.",
};

function AddAdminModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const { request } = useAdminAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("OPERATIONS_MANAGER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await request("/api/admins", { method: "POST", body: { fullName, email, password, role } });
      onDone();
    } catch (err) {
      setError(errorMessage(err, "Unable to create the administrator."));
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add an administrator" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Notice kind="error">{error}</Notice>}
        <Field label="Full name">
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} autoFocus />
        </Field>
        <Field label="Email">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Temporary password" hint="At least 12 characters. They can change it in Settings.">
          <input type="text" autoComplete="off" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Role" hint={ROLE_HELP[role]}>
          <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} className={inputClass}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{humanize(r)}</option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting}>Create administrator</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function TeamPage() {
  const { admin: me, request, hasRole } = useAdminAuth();
  const isSuper = hasRole("SUPER_ADMIN");

  const admins = useResource(async () => {
    if (!isSuper) return [] as Admin[];
    return (await request<ListResponse<Admin[]>>("/api/admins")).data;
  });

  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { reload } = admins;

  async function patch(id: string, body: { role?: AdminRole; status?: "ACTIVE" | "INACTIVE" }) {
    setBusyId(id);
    setError("");

    try {
      await request(`/api/admins/${id}`, { method: "PATCH", body });
      setMessage("Administrator updated.");
      await reload();
    } catch (err) {
      setError(errorMessage(err, "Unable to update the administrator."));
    } finally {
      setBusyId(null);
    }
  }

  if (!isSuper) {
    return <Notice kind="error">Only a super administrator can manage the admin team.</Notice>;
  }

  if (admins.loading) return <PageLoader label="Loading administrators…" />;

  return (
    <>
      <PageHeader
        title="Admin team"
        description="Control who can sign in to the admin portal and what they can do."
        actions={<Button onClick={() => setAdding(true)}><Plus size={16} />Add administrator</Button>}
      />

      {message && <Notice kind="success" onClose={() => setMessage("")}>{message}</Notice>}
      {(error || admins.error) && <Notice kind="error" onClose={() => setError("")}>{error || admins.error}</Notice>}

      <Card>
        {(admins.data ?? []).length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No administrators" description="Add the first administrator." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Administrator</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Added</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(admins.data ?? []).map((a) => {
                  const isMe = a.id === me?.id;
                  return (
                    <tr key={a.id}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{a.fullName}{isMe && <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>}</p>
                        <p className="text-xs text-slate-500">{a.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          aria-label={`Role for ${a.fullName}`}
                          value={a.role}
                          disabled={isMe || busyId === a.id}
                          onChange={(e) => patch(a.id, { role: e.target.value as AdminRole })}
                          className={`${inputClass} w-auto py-1.5`}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={a.status} /></td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(a.createdAt)}</td>
                      <td className="px-5 py-3.5 text-right">
                        {!isMe && (
                          <Button
                            size="sm"
                            variant={a.status === "ACTIVE" ? "danger" : "primary"}
                            loading={busyId === a.id}
                            onClick={() => patch(a.id, { status: a.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}
                          >
                            {a.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adding && (
        <AddAdminModal
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            setMessage("Administrator created.");
            void reload();
          }}
        />
      )}
    </>
  );
}
