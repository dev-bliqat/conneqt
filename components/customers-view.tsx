"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CustomerForm } from "@/components/customer-form";
import { ListItem, SectionCard, StatusPill, SurfaceList } from "@/components/crm-ui";
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
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,16,54,0.45)] p-3 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-[1.8rem] border border-[var(--brand-primary)]/12 bg-white shadow-[0_30px_80px_rgba(58,17,98,0.18)]">
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

        <div className="px-6 py-5">
          <CustomerForm mode="create" ownerOptions={ownerOptions} />
        </div>
      </div>
    </div>
  );
}

function getCustomerStatusTone(status: Customer["status"]) {
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
  const showModal = isModalOpen || openNewCustomer;

  function closeModal() {
    setIsModalOpen(false);
    router.replace(pathname);
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
        customer.status,
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

              return (
                <ListItem key={customer.id} tone={relatedDeals.length > 0 ? "amber" : "plain"}>
                  <Link href={`/kunder/${customer.id}`} className="block">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-[var(--brand-primary)]">
                            {customer.company}
                          </p>
                          <StatusPill tone={getCustomerStatusTone(customer.status)}>
                            {customer.status}
                          </StatusPill>
                        </div>
                        <p className="text-sm text-[var(--brand-primary)]/55">
                          {customer.name} · {customer.segment} · {customer.city || "Ingen stad"}
                        </p>
                      </div>
                      <StatusPill>{`${relatedDeals.length} affärer`}</StatusPill>
                    </div>

                    <p className="mt-3 text-sm text-[var(--brand-primary)]/62">
                      {customer.email || "Ingen e-post"} · {customer.phone || "Ingen telefon"}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-primary)]/40">
                          Statusanteckningar
                        </p>
                        <p className="mt-2 text-sm text-[var(--brand-primary)]/55">
                          {customer.statusNotes || "Inga statusanteckningar ännu."}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-primary)]/40">
                          Follow-up
                        </p>
                        <p className="mt-2 text-sm text-[var(--brand-primary)]/55">
                          {customer.followUpDate || customer.followUpAction
                            ? `${customer.followUpDate || "Datum saknas"} · ${customer.followUpAction || "Åtgärd saknas"}`
                            : "Ingen follow-up planerad."}
                        </p>
                        {customer.lastFollowUpCompletedAt ? (
                          <p className="mt-2 text-xs text-[var(--brand-primary)]/45">
                            Senast klar: {customer.lastFollowUpCompletedAt}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <p className="text-sm font-medium text-[var(--brand-primary)]/65">
                        Aktiva affärer: {relatedDeals.length}
                      </p>
                      <p className="text-sm text-[var(--brand-primary)]/50">
                        {customer.notes || "Inga övriga anteckningar ännu."}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
                      <span className="rounded-full border border-[var(--brand-primary)]/10 px-4 py-2 text-sm font-medium text-[var(--brand-primary)] transition hover:bg-[var(--brand-lilac)]/18">
                        Öppna kundsida
                      </span>
                    </div>
                  </Link>
                </ListItem>
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
