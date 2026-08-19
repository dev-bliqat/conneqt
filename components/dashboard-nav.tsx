"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigation";

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
              isActive
                ? "bg-[var(--brand-primary)] text-white shadow-[0_12px_24px_rgba(58,17,98,0.18)]"
                : "text-[var(--brand-primary)]/72 hover:bg-[var(--brand-lilac)]/18 hover:text-[var(--brand-primary)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/import"
        className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
          pathname === "/import"
            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-[0_12px_24px_rgba(58,17,98,0.18)]"
            : "border-[var(--brand-primary)]/12 text-[var(--brand-primary)]/72 hover:border-[var(--brand-primary)]/22 hover:bg-[var(--brand-lilac)]/18 hover:text-[var(--brand-primary)]"
        }`}
      >
        Importera
      </Link>
    </nav>
  );
}
