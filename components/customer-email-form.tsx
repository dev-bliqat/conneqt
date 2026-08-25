"use client";

import { useActionState, useMemo, useState } from "react";
import { sendBulkCustomerEmail } from "@/app/actions";
import { SubmitButton } from "@/components/crm-ui";
import { initialCustomerEmailState } from "@/lib/customer-email-state";

type CustomerEmailFormProps = {
  customerName?: string;
  signature: string;
};

export function CustomerEmailForm({
  customerName = "",
  signature,
}: CustomerEmailFormProps) {
  const [state, formAction] = useActionState(
    sendBulkCustomerEmail,
    initialCustomerEmailState,
  );
  const [manualRecipients, setManualRecipients] = useState("");

  const defaultBody = useMemo(() => {
    return [
      `Hej ${customerName || ""},`,
      "",
      "",
      "",
    ].join("\n");
  }, [customerName]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="recipients" value={manualRecipients} />
      <input type="hidden" name="retryRecipients" value={state.failedRecipients.join("\n")} />

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--brand-primary)]/72">
          Mottagare
        </span>
        <textarea
          value={manualRecipients}
          onChange={(event) => setManualRecipients(event.target.value)}
          rows={4}
          placeholder="En e-postadress per rad, eller separera med komma"
          className="w-full rounded-2xl bg-white/72 px-4 py-3 text-sm text-[var(--brand-primary)] outline-none shadow-[inset_0_0_0_1px_rgba(58,17,98,0.06)] transition placeholder:text-[var(--brand-primary)]/35 focus:bg-white focus:shadow-[inset_0_0_0_1.5px_rgba(233,87,59,0.45)]"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--brand-primary)]/72">
          Ämne
        </span>
        <input
          name="subject"
          placeholder={`Uppföljning från Bliqat till ${customerName}`}
          className="w-full rounded-2xl bg-white/72 px-4 py-3 text-sm text-[var(--brand-primary)] outline-none shadow-[inset_0_0_0_1px_rgba(58,17,98,0.06)] transition placeholder:text-[var(--brand-primary)]/35 focus:bg-white focus:shadow-[inset_0_0_0_1.5px_rgba(233,87,59,0.45)]"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--brand-primary)]/72">
          Meddelande
        </span>
        <textarea
          name="body"
          defaultValue={defaultBody}
          rows={12}
          className="w-full rounded-2xl bg-white/72 px-4 py-3 text-sm text-[var(--brand-primary)] outline-none shadow-[inset_0_0_0_1px_rgba(58,17,98,0.06)] transition placeholder:text-[var(--brand-primary)]/35 focus:bg-white focus:shadow-[inset_0_0_0_1.5px_rgba(233,87,59,0.45)]"
        />
      </label>

      <div className="rounded-2xl bg-[var(--brand-lilac)]/10 px-4 py-3 text-sm text-[var(--brand-primary)]/65">
        Utskicket skickas som separata mejl i bakgrunden, så varje mottagare ser bara sin
        egen adress.
      </div>

      {state.error ? (
        <div className="rounded-2xl bg-[#fff2f2] px-4 py-3 text-sm text-[#a43b3b]">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-2xl bg-[#edf8ee] px-4 py-3 text-sm text-[#2d6a33]">
          {state.success}
        </div>
      ) : null}

      {state.recipientStatuses.length > 0 ? (
        <div className="space-y-3 border-t border-[var(--brand-primary)]/10 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--brand-primary)]">
                Status för utskick
              </p>
              <p className="mt-1 text-sm text-[var(--brand-primary)]/62">
                {state.sentCount} skickade · {state.failedCount} misslyckade
              </p>
            </div>

            {state.failedRecipients.length > 0 ? (
              <button
                type="submit"
                name="retryMode"
                value="failed-only"
                className="rounded-full border border-[var(--brand-primary)]/14 px-4 py-2 text-sm font-medium text-[var(--brand-primary)] transition hover:bg-white/70"
              >
                Försök igen med misslyckade
              </button>
            ) : null}
          </div>

          <div className="space-y-2">
            {state.recipientStatuses.map((item) => (
              <div
                key={item.recipient}
                className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--brand-primary)]/8 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--brand-primary)]">
                    {item.recipient}
                  </p>
                  {item.message ? (
                    <p className="mt-1 text-xs text-[var(--brand-primary)]/55">{item.message}</p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.ok
                      ? "bg-[#edf8ee] text-[#2d6a33]"
                      : "bg-[#fff2f2] text-[#a43b3b]"
                  }`}
                >
                  {item.ok ? "Skickat" : "Misslyckades"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton>Skicka utskick</SubmitButton>
      </div>
    </form>
  );
}
