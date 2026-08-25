"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { GOOGLE_CALENDAR_SCOPE } from "@/lib/google-calendar-shared";
import { GOOGLE_GMAIL_SEND_SCOPE } from "@/lib/google-mail-shared";

const callbackUrl = "/sso-callback";
const returnUrl = "/user-profile/google-access";
const requestedScopes = [GOOGLE_CALENDAR_SCOPE, GOOGLE_GMAIL_SEND_SCOPE] as const;

export function GoogleAccountReauthorize() {
  const { isLoaded, user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleAccount = useMemo(
    () => user?.externalAccounts.find((account) => account.provider === "google") ?? null,
    [user],
  );

  const approvedScopes = useMemo(() => {
    return new Set(
      (googleAccount?.approvedScopes ?? "")
        .split(",")
        .map((scope) => scope.trim())
        .filter(Boolean),
    );
  }, [googleAccount]);

  const missingScopes = requestedScopes.filter((scope) => !approvedScopes.has(scope));

  async function handleReconnect() {
    if (!user) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (googleAccount) {
        await googleAccount.reauthorize({
          additionalScopes: [...requestedScopes],
          redirectUrl: callbackUrl,
          oidcPrompt: "consent",
        });
        return;
      }

      await user.createExternalAccount({
        strategy: "oauth_google",
        redirectUrl: callbackUrl,
        additionalScopes: [...requestedScopes],
        oidcPrompt: "consent",
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Google-kopplingen kunde inte startas.";
      setError(message);
      setIsSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--brand-primary)]/60">Laddar Google-koppling…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm text-[var(--brand-primary)]/68">
          Här kan vi alltid starta om Google-auktoriseringen om kalender eller Gmail saknar
          behörighet.
        </p>
        <p className="text-sm text-[var(--brand-primary)]/68">
          Efter godkännande skickas du tillbaka till <code>/user-profile/google-access</code>.
        </p>
      </div>

      <div className="rounded-2xl bg-[var(--brand-lilac)]/10 px-4 py-4 text-sm text-[var(--brand-primary)]/72">
        <p>
          Status:{" "}
          <strong className="text-[var(--brand-primary)]">
            {googleAccount ? "Google-konto anslutet" : "Ingen Google-koppling hittad"}
          </strong>
        </p>
        <p className="mt-2">
          Kalender-scope:{" "}
          <strong>{approvedScopes.has(GOOGLE_CALENDAR_SCOPE) ? "klar" : "saknas"}</strong>
        </p>
        <p className="mt-1">
          Gmail-scope:{" "}
          <strong>{approvedScopes.has(GOOGLE_GMAIL_SEND_SCOPE) ? "klar" : "saknas"}</strong>
        </p>
        {missingScopes.length > 0 ? (
          <p className="mt-3 text-[13px] text-[var(--brand-primary)]/58">
            Saknade scopes: {missingScopes.join(", ")}
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl bg-[#fff2f2] px-4 py-3 text-sm text-[#a43b3b]">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleReconnect()}
          disabled={isSubmitting}
          className="rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--brand-ink)] disabled:cursor-not-allowed disabled:bg-[var(--brand-primary)]/35"
        >
          {isSubmitting ? "Startar Google-anslutning…" : "Återanslut Google"}
        </button>
        <a
          href={returnUrl}
          className="text-sm font-medium text-[var(--brand-primary)]/68 underline underline-offset-4"
        >
          Ladda om denna sida
        </a>
      </div>
    </div>
  );
}
