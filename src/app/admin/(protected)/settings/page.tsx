"use client";

import { Card, PageHeader } from "@/components/ui";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { StatusBadge } from "@/components/ui";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function SettingsPage() {
  const { admin, request } = useAdminAuth();

  if (!admin) return null;

  return (
    <>
      <PageHeader title="Settings" description="Your account details and password." />

      <Card className="p-6">
        <h2 className="font-bold text-slate-900">Account</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Name</dt>
            <dd className="mt-1 font-medium text-slate-900">{admin.fullName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="mt-1 font-medium text-slate-900">{admin.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd className="mt-1"><StatusBadge status={admin.role} /></dd>
          </div>
        </dl>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-bold text-slate-900">Change password</h2>
        <ChangePasswordForm
          minLength={12}
          onSubmit={async (currentPassword, newPassword) => {
            await request("/api/admin/password", {
              method: "PATCH",
              body: { currentPassword, newPassword },
            });
          }}
        />
      </Card>
    </>
  );
}
