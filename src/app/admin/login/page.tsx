"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { FullScreenLoader, Notice, inputClass } from "@/components/ui";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { errorMessage } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const { status, login } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/admin/dashboard");
  }, [status, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      router.replace("/admin/dashboard");
    } catch (err) {
      setError(errorMessage(err, "Sign in failed. Please try again."));
      setSubmitting(false);
    }
  }

  if (status === "loading" || status === "authenticated") {
    return <FullScreenLoader />;
  }

  return (
    <AuthLayout
      heading="Run waste collection from one control room."
      intro="Monitor every smart bin, respond to alerts and keep your collectors moving."
      points={[
        "Live fill levels and overflow alerts",
        "Register bins and collectors",
        "Assign, track and review collections",
      ]}
    >
      <h2 className="text-3xl font-bold tracking-tight text-slate-900">
        Administrator sign in
      </h2>
      <p className="mt-2 text-slate-500">
        Use the account created for you by EcoTrack.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        {error && <Notice kind="error">{error}</Notice>}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Email address
          </span>
          <div className="relative">
            <Mail
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`${inputClass} pl-10`}
              placeholder="you@company.com"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Password
          </span>
          <div className="relative">
            <LockKeyhole
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputClass} pl-10 pr-11`}
              placeholder="Your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={submitting || !email.trim() || !password}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest px-4 py-3 font-semibold text-white transition hover:bg-[#0a5239] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
