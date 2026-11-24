import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Leaf } from "lucide-react";

export function AuthLayout({
  heading,
  intro,
  points,
  children,
}: {
  heading: string;
  intro: string;
  points: string[];
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-40 -left-20 h-[500px] w-[500px] rounded-full border border-white/10" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="rounded-xl bg-green-400 p-2.5 text-green-950">
            <Leaf size={24} />
          </span>
          <span className="text-2xl font-bold tracking-tight">EcoTrack</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            {heading}
          </h1>
          <p className="mt-5 text-lg text-green-100/85">{intro}</p>
          <ul className="mt-8 space-y-3 text-green-50/90">
            {points.map((point) => (
              <li key={point} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-300" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-green-200/70">
          Smart waste monitoring for cleaner cities.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={16} />
            Back to EcoTrack
          </Link>
          {children}
        </div>
      </section>
    </main>
  );
}
