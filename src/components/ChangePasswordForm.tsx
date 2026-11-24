"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Notice, inputClass } from "@/components/ui";
import { errorMessage } from "@/lib/api";

export function ChangePasswordForm({
  minLength,
  onSubmit,
}: {
  minLength: number;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setDone(false);

    if (next.length < minLength) {
      setError(`The new password must contain at least ${minLength} characters.`);
      return;
    }

    if (next !== confirm) {
      setError("The new password and its confirmation do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, "Unable to change the password."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      {error && <Notice kind="error">{error}</Notice>}
      {done && <Notice kind="success">Your password has been changed.</Notice>}

      <Field label="Current password">
        <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
      </Field>
      <Field label="New password" hint={`At least ${minLength} characters.`}>
        <input type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Confirm new password">
        <input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
      </Field>
      <Button type="submit" loading={submitting}>Change password</Button>
    </form>
  );
}
