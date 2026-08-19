import type { ReactNode } from "react";

export function PageStack({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] bg-[rgba(255,255,255,0.82)] shadow-[0_16px_34px_rgba(58,17,98,0.05)] backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 bg-[linear-gradient(90deg,_rgba(212,178,231,0.1)_0%,_rgba(255,255,255,0.72)_100%)] px-6 py-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--brand-primary)]/42">
            Sektion
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--brand-primary)]">{title}</h2>
          {subtitle ? (
            <p className="mt-2 text-sm text-[var(--brand-primary)]/60">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "amber",
}: {
  label: string;
  value: string;
  hint: string;
  accent?: "amber" | "dark" | "soft";
}) {
  const accents = {
    amber:
      "bg-[linear-gradient(180deg,_rgba(254,182,211,0.18)_0%,_rgba(255,255,255,0.98)_100%)]",
    dark:
      "bg-[linear-gradient(180deg,_rgba(58,17,98,0.96)_0%,_rgba(36,16,54,0.96)_100%)] text-white",
    soft:
      "bg-[linear-gradient(180deg,_rgba(212,178,231,0.14)_0%,_rgba(255,255,255,0.98)_100%)]",
  } as const;

  return (
    <article
      className={`rounded-[1.35rem] p-5 shadow-[0_14px_28px_rgba(0,0,0,0.04)] ${accents[accent]}`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--brand-primary)]/45">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-current/70">{hint}</p>
    </article>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  meta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  meta?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[1.7rem] bg-[radial-gradient(circle_at_top_left,_rgba(212,178,231,0.5),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(233,87,59,0.16),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.95)_0%,_rgba(248,242,250,0.96)_100%)] shadow-[0_18px_44px_rgba(58,17,98,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-6 px-8 py-8">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-[var(--brand-primary)]/45">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--brand-primary)]">
            {title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-[var(--brand-primary)]/65">{description}</p>
        </div>
        {meta ? <div className="min-w-[220px]">{meta}</div> : null}
      </div>
    </div>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-white/72 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-black/50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
      
      {children}
    </span>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "amber" | "green" | "dark";
}) {
  const tones = {
    neutral:
      "bg-[var(--brand-primary)]/[0.05] text-[var(--brand-primary)]/65 shadow-[inset_0_0_0_1px_rgba(58,17,98,0.05)]",
    amber: "bg-[var(--brand-pink)]/26 text-[var(--brand-primary)] shadow-[inset_0_0_0_1px_rgba(254,182,211,0.32)]",
    green: "bg-[#edf8ee] text-[#2d6a33] shadow-[inset_0_0_0_1px_rgba(45,106,51,0.08)]",
    dark: "bg-[var(--brand-primary)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
  } as const;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function FormGrid({
  children,
  columns = "two",
}: {
  children: ReactNode;
  columns?: "two" | "four";
}) {
  return (
    <div
      className={
        columns === "four"
          ? "grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          : "grid gap-4 md:grid-cols-2"
      }
    >
      {children}
    </div>
  );
}

export function SurfaceList({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function ListItem({
  children,
  tone = "plain",
}: {
  children: ReactNode;
  tone?: "plain" | "amber";
}) {
  return (
    <article
      className={`rounded-[1.35rem] p-5 shadow-[0_10px_24px_rgba(58,17,98,0.035)] ${
        tone === "amber"
          ? "bg-[linear-gradient(180deg,_rgba(254,182,211,0.12)_0%,_rgba(255,255,255,0.98)_100%)]"
          : "bg-[rgba(255,255,255,0.78)]"
      }`}
    >
      {children}
    </article>
  );
}

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string | number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--brand-primary)]/72">{label}</span>
      <input
        className="w-full rounded-2xl bg-white/72 px-4 py-3 text-sm text-[var(--brand-primary)] outline-none shadow-[inset_0_0_0_1px_rgba(58,17,98,0.06)] transition placeholder:text-[var(--brand-primary)]/35 focus:bg-white focus:shadow-[inset_0_0_0_1.5px_rgba(233,87,59,0.45)]"
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
    </label>
  );
}

export function Textarea({
  label,
  name,
  placeholder,
  defaultValue,
  rows,
  className,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--brand-primary)]/72">{label}</span>
      <textarea
        className={`w-full rounded-2xl bg-white/72 px-4 py-3 text-sm text-[var(--brand-primary)] outline-none shadow-[inset_0_0_0_1px_rgba(58,17,98,0.06)] transition placeholder:text-[var(--brand-primary)]/35 focus:bg-white focus:shadow-[inset_0_0_0_1.5px_rgba(233,87,59,0.45)] ${className ?? "min-h-28"}`}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        rows={rows}
      />
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  disabled = false,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--brand-primary)]/72">{label}</span>
      <select
        className="w-full rounded-2xl bg-white/72 px-4 py-3 text-sm text-[var(--brand-primary)] outline-none shadow-[inset_0_0_0_1px_rgba(58,17,98,0.06)] transition focus:bg-white focus:shadow-[inset_0_0_0_1.5px_rgba(233,87,59,0.45)] disabled:cursor-not-allowed disabled:bg-[var(--brand-lilac)]/12 disabled:text-[var(--brand-primary)]/45 disabled:shadow-[inset_0_0_0_1px_rgba(58,17,98,0.04)]"
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OwnerSelect({
  options,
  defaultValue,
}: {
  options: string[];
  defaultValue?: string;
}) {
  if (options.length > 0) {
    return (
      <Select
        label="Ansvarig"
        name="owner"
        options={options}
        defaultValue={defaultValue ?? options[0]}
      />
    );
  }

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--brand-primary)]/72">Ansvarig</span>
      <select
        className="w-full rounded-2xl bg-white/72 px-4 py-3 text-sm text-[var(--brand-primary)]/45 outline-none shadow-[inset_0_0_0_1px_rgba(58,17,98,0.05)]"
        name="owner"
        defaultValue=""
        disabled
      >
        <option value="">Inga säljare tillgängliga</option>
      </select>
      <p className="mt-2 text-xs text-[var(--brand-primary)]/55">
        Lägg till minst en användare med rollen Säljare på `/admin`.
      </p>
    </label>
  );
}

export function SubmitButton({
  children,
  disabled = false,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--brand-ink)] disabled:cursor-not-allowed disabled:bg-[var(--brand-primary)]/35 disabled:hover:bg-[var(--brand-primary)]/35"
    >
      {children}
    </button>
  );
}
