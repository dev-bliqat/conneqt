import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/hem");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--brand-primary)]/10 bg-white shadow-[0_30px_80px_rgba(58,17,98,0.1)]">
        <div className="grid gap-10 bg-[radial-gradient(circle_at_top_left,_rgba(212,178,231,0.5),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(233,87,59,0.18),_transparent_22%),linear-gradient(135deg,_#f8f2fa_0%,_#ffffff_48%,_#f4ede4_100%)] px-8 py-16 md:grid-cols-[1.15fr_0.85fr] md:px-12">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-[0.35em] text-[var(--brand-primary)]/45">
              Uppkopplad arbetsyta
            </p>
            <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-[var(--brand-primary)]">
              Bliqat Connect samlar leads, kunder och pipeline i ett lugnt arbetsflöde.
            </h1>
            <p className="max-w-lg text-lg leading-8 text-[var(--brand-primary)]/65">
              Logga in för att öppna sidorna Hem, Leads, Analys, Aktiviteter,
              Kunder, Pipeline och Profil.
            </p>
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-[1.75rem] border border-[var(--brand-primary)]/10 bg-[var(--brand-primary)] p-6 text-white shadow-2xl">
              <p className="text-sm uppercase tracking-[0.3em] text-white/55">
                Meny
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  "Hem",
                  "Leads",
                  "Analys",
                  "Aktiviteter",
                  "Kunder",
                  "Pipeline",
                  "Profil",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/82"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
