"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CustomerForm } from "@/components/customer-form";
import { SectionCard, StatusPill, SurfaceList } from "@/components/crm-ui";
import { type Customer, type Deal } from "@/lib/crm-types";

type CustomersViewProps = {
  customers: Customer[];
  deals: Deal[];
  ownerOptions: string[];
  openNewCustomer?: boolean;
};

function CustomerModal({
  open,
  onClose,
  ownerOptions,
}: {
  open: boolean;
  onClose: () => void;
  ownerOptions: string[];
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,16,54,0.45)] p-3 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.8rem] border border-[var(--brand-primary)]/12 bg-white shadow-[0_30px_80px_rgba(58,17,98,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--brand-primary)]/8 px-6 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--brand-primary)]/42">
              Ny kund
            </p>
            <h2 className="mt-1.5 text-[1.7rem] font-semibold text-[var(--brand-primary)]">
              Lägg till företagskund
            </h2>
            <p className="mt-1.5 text-sm text-[var(--brand-primary)]/60">
              Fyll i kontaktperson, kundstatus och nästa uppföljning.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--brand-primary)]/10 px-3 py-2 text-sm font-medium text-[var(--brand-primary)]/65 transition hover:bg-[var(--brand-lilac)]/18 hover:text-[var(--brand-primary)]"
          >
            Stäng
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <CustomerForm mode="create" ownerOptions={ownerOptions} />
        </div>
      </div>
    </div>
  );
}

function getCustomerStatusTone(status: Customer["status"]) {
  if (!status) {
    return "neutral";
  }

  if (status === "Betalande kund" || status === "Konto skapat") {
    return "green";
  }

  if (status === "Ska boka nytt möte" || status === "Ska skapa konto") {
    return "amber";
  }

  return "neutral";
}

export function CustomersView({
  customers,
  deals,
  ownerOptions,
  openNewCustomer = false,
}: CustomersViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const showModal = isModalOpen || openNewCustomer;

  function closeModal() {
    setIsModalOpen(false);
    router.replace(pathname);
  }

  function toggleCustomer(customerId: string) {
    setExpandedCustomerId((current) => (current === customerId ? null : customerId));
  }

  const filteredCustomers = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        customer.company,
        customer.name,
        customer.email,
        customer.phone,
        customer.city,
        customer.status || "Ingen status",
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search)),
    );
  }, [customers, query]);

  return (
    <>
      <SectionCard
        title="Kundlista"
        subtitle="Sök bland företagskunder, se status direkt och öppna kundsidan för att uppdatera kunden."
        action={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--brand-ink)]"
          >
            Ny kund
          </button>
        }
      >
        <div className="mb-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--brand-primary)]/72">
              Sök kund
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Sök på bolag, kontaktperson, e-post, telefon eller status"
              className="w-full rounded-2xl border border-[var(--brand-primary)]/10 bg-white/85 px-4 py-3 text-sm text-[var(--brand-primary)] outline-none transition placeholder:text-[var(--brand-primary)]/35 focus:border-[var(--brand-coral)] focus:bg-white"
            />
          </label>
        </div>

        <SurfaceList>
          {filteredCustomers.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-[var(--brand-primary)]/18 bg-[var(--brand-lilac)]/10 px-5 py-10 text-center">
              <p className="text-base font-medium text-[var(--brand-primary)]">
                Inga kunder matchar din sökning
              </p>
              <p className="mt-2 text-sm text-[var(--brand-primary)]/60">
                Justera sökningen eller skapa en ny kund via knappen ovan.
              </p>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const relatedDeals = deals.filter(
                (deal) => deal.customerId === customer.id || deal.company === customer.company,
              );
              const isExpanded = expandedCustomerId === customer.id;

              return (
                <article
                  key={customer.id}
                  className="overflow-hidden border-b border-[var(--brand-primary)]/8 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => toggleCustomer(customer.id)}
                    className="flex w-full items-center gap-3 px-1 py-4 text-left transition hover:bg-[var(--brand-lilac)]/8"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/6 text-lg text-[var(--brand-primary)]/70 transition ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                      aria-hidden="true"
                    >
                      {"›"}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-[var(--brand-primary)]">
                            {customer.company}
                          </p>
                          <p className="truncate text-sm text-[var(--brand-primary)]/55">
                            {customer.name} · {customer.email || "Ingen e-post"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]/38">
                            Ansvarig
                          </p>
                          <p className="truncate text-sm text-[var(--brand-primary)]/68">
                            {customer.owner || "Ej satt"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]/38">
                            Follow-up
                          </p>
                          <p className="truncate text-sm text-[var(--brand-primary)]/68">
                            {customer.followUpDate || "Ingen planerad"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                          <StatusPill tone={getCustomerStatusTone(customer.status)}>
                            {customer.status || "Ingen status"}
                          </StatusPill>
                          {customer.isActive ? (
                            <StatusPill tone="green">Aktiv</StatusPill>
                          ) : null}
                          <StatusPill>{`${relatedDeals.length} affärer`}</StatusPill>
                        </div>
                      </div>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-[var(--brand-primary)]/8 px-1 py-5">
                      <div className="grid gap-5 lg:grid-cols-2">
                        <div className="space-y-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]/38">
                              Kontaktuppgifter
                            </p>
                            <p className="mt-2 text-sm text-[var(--brand-primary)]/64">
                              {customer.email || "Ingen e-post"} · {customer.phone || "Ingen telefon"}
                            </p>
                            <p className="mt-1 text-sm text-[var(--brand-primary)]/52">
                              {customer.segment} · {customer.city || "Ingen stad"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]/38">
                              Statusanteckningar
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[var(--brand-primary)]/60">
                              {customer.statusNotes || "Inga statusanteckningar ännu."}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]/38">
                              Nästa follow-up
                            </p>
                            <p className="mt-2 text-sm text-[var(--brand-primary)]/64">
                              {customer.followUpDate || customer.followUpAction
                                ? `${customer.followUpDate || "Datum saknas"} · ${customer.followUpAction || "Åtgärd saknas"}`
                                : "Ingen follow-up planerad."}
                            </p>
                            {customer.lastFollowUpCompletedAt ? (
                              <p className="mt-1 text-xs text-[var(--brand-primary)]/45">
                                Senast klar: {customer.lastFollowUpCompletedAt}
                              </p>
                            ) : null}
                          </div>

                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]/38">
                              Övriga anteckningar
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[var(--brand-primary)]/60">
                              {customer.notes || "Inga övriga anteckningar ännu."}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {customer.wonAt ? (
                            <StatusPill tone="green">
                              Vunnen
                              {customer.wonValue > 0
                                ? ` · ${new Intl.NumberFormat("sv-SE").format(customer.wonValue)} SEK`
                                : ""}
                            </StatusPill>
                          ) : null}
                        </div>

                        <Link
                          href={`/kunder/${customer.id}`}
                          className="rounded-full border border-[var(--brand-primary)]/10 px-4 py-2 text-sm font-medium text-[var(--brand-primary)] transition hover:bg-[var(--brand-lilac)]/18"
                        >
                          Öppna kundsida
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </SurfaceList>
      </SectionCard>

      <CustomerModal
        open={showModal}
        onClose={closeModal}
        ownerOptions={ownerOptions}
      />
    </>
  );
}
