type DashboardPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
};

export function DashboardPage({
  eyebrow,
  title,
  description,
  highlights,
}: DashboardPageProps) {
  return (
    <section className="rounded-[1.5rem] border border-dashed border-black/10 bg-[linear-gradient(135deg,_rgba(244,182,95,0.18),_transparent_30%),linear-gradient(180deg,_#fffdf9_0%,_#ffffff_100%)] p-8">
      <div className="max-w-4xl">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-black/40">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-black">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-black/55">
          {description}
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {highlights.map((item, index) => (
          <article
            key={item}
            className="rounded-[1.25rem] border border-black/8 bg-white/85 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.05)]"
          >
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-black/35">
              Kort {index + 1}
            </p>
            <p className="mt-4 text-base font-medium text-black/75">{item}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
