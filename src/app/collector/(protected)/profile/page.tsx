"use client";

import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { useCollectorAuth } from "@/context/CollectorAuthContext";

export default function CollectorProfilePage() {
  const { collector, request } = useCollectorAuth();

  if (!collector) return null;

  return (
    <>
      <PageHeader title="Profile" description="Your details are managed by your administrator." />

      <Card className="p-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {[
            ["Full name", collector.fullName],
            ["Phone", collector.phone],
            ["Email", collector.email || "—"],
            ["Address", collector.address || "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-slate-500">{label}</dt>
              <dd className="mt-1 font-medium text-slate-900">{value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-slate-500">Account status</dt>
            <dd className="mt-1"><StatusBadge status={collector.status} /></dd>
          </div>
        </dl>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-bold text-slate-900">Change password</h2>
        <ChangePasswordForm
          minLength={8}
          onSubmit={async (currentPassword, newPassword) => {
            await request("/api/collector/password", {
              method: "PATCH",
              body: { currentPassword, newPassword },
            });
          }}
        />
      </Card>
    </>
  );
}
