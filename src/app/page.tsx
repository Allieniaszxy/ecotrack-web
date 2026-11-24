import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Leaf,
  Radio,
  ShieldCheck,
  Truck,
} from "lucide-react";

const flow = [
  {
    icon: Radio,
    title: "Bins report their fill level",
    text: "An ultrasonic sensor on each bin sends its reading over MQTT every few seconds.",
  },
  {
    icon: BellRing,
    title: "EcoTrack raises an alert",
    text: "At 75% the bin is flagged as high, and at 90% as critical, so nothing overflows unnoticed.",
  },
  {
    icon: Truck,
    title: "A collector is dispatched",
    text: "Administrators assign the bin to a collector, who accepts and completes the pickup from their phone.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-forest p-2 text-green-300">
            <Leaf size={22} />
          </span>
          <span className="text-xl font-bold tracking-tight">EcoTrack</span>
        </div>
        <Link
          href="/collector/login"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Collector sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-forest sm:text-5xl">
              Collect bins when they are full, not on a fixed round.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-600">
              EcoTrack monitors smart waste bins in real time, warns the
              operations team before they overflow, and dispatches collectors
              with the right bin at the right time.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-2 rounded-xl bg-forest px-6 py-3.5 font-semibold text-white transition hover:bg-[#0a5239]"
              >
                <ShieldCheck size={18} />
                Administrator sign in
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/collector/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                <Truck size={18} />
                Collector sign in
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Live bin status
            </p>
            <ul className="mt-5 space-y-5">
              {[
                ["Ikeja Market", 94, "bg-red-500", "Critical"],
                ["Yaba Bus Stop", 78, "bg-amber-500", "High"],
                ["Lekki Phase 1", 52, "bg-blue-500", "Filling"],
                ["Surulere Park", 21, "bg-emerald-500", "Normal"],
              ].map(([name, fill, color, label]) => (
                <li key={name as string}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-slate-800">{name}</span>
                    <span className="text-slate-500">
                      {fill}% · {label}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${fill}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-slate-400">
              Illustration with sample data.
            </p>
          </div>
        </section>

        <section aria-labelledby="how-it-works" className="border-t border-slate-200 pt-14">
          <h2 id="how-it-works" className="text-2xl font-bold tracking-tight">
            How it works
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {flow.map((step, index) => (
              <li key={step.title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <step.icon size={20} className="text-leaf" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
