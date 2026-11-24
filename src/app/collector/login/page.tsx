"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole, UserRound } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { FullScreenLoader, Notice, inputClass } from "@/components/ui";
import { useCollectorAuth } from "@/context/CollectorAuthContext";
import { errorMessage } from "@/lib/api";

export default function CollectorLoginPage() {
  const router = useRouter();
  const { status, login } = useCollectorAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/collector/dashboard");
  }, [status, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(identifier.trim(), password);
      router.replace("/collector/dashboard");
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
      heading="Your pickups for the day, in one place."
      intro="See which bins need emptying, accept assignments and report problems on the road."
      points={[
        "Assignments arrive as soon as they are dispatched",
        "Accept, start and complete each collection",
        "Flag blocked or damaged bins with a note",
      ]}
    >
      <h2 className="text-3xl font-bold tracking-tight text-slate-900">Collector sign in</h2>
      <p className="mt-2 text-slate-500">Use your email address or phone number.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        {error && <Notice kind="error">{error}</Notice>}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Email or phone number</span>
          <div className="relative">
            <UserRound size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={`${inputClass} pl-10`}
              placeholder="08012345678"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
          <div className="relative">
            <LockKeyhole size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pl-10 pr-11`}
              placeholder="Your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={submitting || !identifier.trim() || !password}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 font-semibold text-white transition hover:bg-[#066a3b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-sm text-slate-500">
          Forgot your password? Ask your administrator to reset it.
        </p>
      </form>
    </AuthLayout>
  );
}
