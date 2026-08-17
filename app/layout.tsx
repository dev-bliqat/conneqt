import type { Metadata } from "next";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { DashboardNav } from "@/components/dashboard-nav";
import { GOOGLE_CALENDAR_SCOPE } from "@/lib/google-calendar-shared";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bliqat Connect",
  description: "Bliqat Connect med inloggning och CRM-arbetsyta",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <header className="border-b border-[var(--brand-primary)]/10 bg-[rgba(255,255,255,0.88)] backdrop-blur">
            <div className="mx-auto w-full max-w-[1500px] px-4 py-4 md:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <Link href="/" className="flex shrink-0 items-center gap-3">
                    <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[1.15rem] bg-[linear-gradient(180deg,_var(--brand-primary)_0%,_#5c1c90_100%)] shadow-[0_10px_24px_rgba(58,17,98,0.2)]">
                      <span className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-[linear-gradient(180deg,_rgba(233,87,59,0.95)_0%,_rgba(254,182,211,0.92)_100%)]" />
                      <span className="absolute left-0 top-0 h-6 w-6 rounded-br-[1rem] bg-white/14" />
                    </span>
                    <span className="block">
                      <span className="block text-[1.3rem] font-semibold leading-none tracking-[-0.03em] text-[var(--brand-primary)]">
                        bliqat.
                      </span>
                      <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--brand-primary)]/45">
                        CRM-arbetsyta
                      </span>
                    </span>
                  </Link>
                </div>

                <Show when="signed-in">
                  <div className="flex min-w-0 flex-1 justify-center">
                    <DashboardNav />
                  </div>
                </Show>

                <div className="flex shrink-0 items-center justify-end gap-3">
                  <Show when="signed-out">
                    <SignInButton>
                      <button className="rounded-full border border-[var(--brand-primary)]/12 px-4 py-2.5 text-sm font-medium text-[var(--brand-primary)] transition hover:border-[var(--brand-primary)]/22 hover:bg-[var(--brand-lilac)]/18">
                        Logga in
                      </button>
                    </SignInButton>
                    <SignUpButton>
                      <button className="rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--brand-ink)]">
                        Skapa konto
                      </button>
                    </SignUpButton>
                  </Show>
                  <Show when="signed-in">
                    <UserButton
                      userProfileProps={{
                        additionalOAuthScopes: {
                          google: [GOOGLE_CALENDAR_SCOPE],
                        },
                      }}
                    />
                    <Link
                      href="/kunder?newCustomer=1"
                      className="rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--brand-ink)]"
                    >
                      Ny kund
                    </Link>
                  </Show>
                </div>
              </div>
            </div>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
