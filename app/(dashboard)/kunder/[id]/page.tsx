import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";
import {
  ListItem,
  PageStack,
  SectionCard,
  StatCard,
  StatusPill,
  SurfaceList,
} from "@/components/crm-ui";
import { getSellerOwnerOptions } from "@/lib/crm-users";
import { formatCurrency, readCrmData } from "@/lib/crm-store";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, ownerOptions] = await Promise.all([
    readCrmData(),
    getSellerOwnerOptions(),
  ]);

  const customer = data.customers.find((item) => item.id === id);

  if (!customer) {
    notFound();
  }

  const relatedDeals = data.deals.filter(
    (deal) => deal.customerId === customer.id || deal.company === customer.company,
  );
  const relatedActivities = data.activities.filter(
    (activity) => activity.relatedType === "customer" && activity.relatedId === customer.id,
  );
  const wonValue = customer.wonValue > 0
    ? formatCurrency(customer.wonValue)
    : "Ej satt";

  return (
    <PageStack>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/kunder"
            className="text-sm font-medium text-[var(--brand-primary)]/55 transition hover:text-[var(--brand-primary)]"
          >
            Tillbaka till kunder
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--brand-primary)]">
            {customer.company}
          </h1>
          <p className="mt-2 text-sm text-[var(--brand-primary)]/60">
            {customer.name} · {customer.email || "Ingen e-post"} · {customer.phone || "Ingen telefon"}
          </p>
        </div>
        <StatusPill tone={customer.status === "Betalande kund" ? "green" : "neutral"}>
          {customer.status || "Ingen status"}
        </StatusPill>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Ansvarig"
          value={customer.owner || "Ej satt"}
          hint="Nuvarande ägare i CRM"
          accent="amber"
        />
        <StatCard
          label="Nästa follow-up"
          value={customer.followUpDate || "Ingen"}
          hint={customer.followUpAction || "Ingen uppföljning planerad"}
          accent="soft"
        />
        <StatCard
          label="Vunnet värde"
          value={wonValue}
          hint={customer.wonAt ? `Vunnen ${customer.wonAt}` : "Inte markerad som vunnen"}
          accent="dark"
        />
        <StatCard
          label="Affärer"
          value={String(relatedDeals.length)}
          hint="Kopplade till kunden"
          accent="soft"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Uppdatera kund"
          subtitle="Ändra status, markera follow-up som klar, sätt nästa steg eller markera kunden som vunnen."
        >
          <CustomerForm mode="edit" ownerOptions={ownerOptions} customer={customer} />
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="Kundöversikt"
            subtitle="Nuvarande läge och viktig information."
          >
            <SurfaceList>
              <ListItem>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-primary)]/40">
                  Statusanteckningar
                </p>
                <p className="mt-2 text-sm text-[var(--brand-primary)]/60">
                  {customer.statusNotes || "Inga statusanteckningar ännu."}
                </p>
              </ListItem>
              <ListItem>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-primary)]/40">
                  Övriga anteckningar
                </p>
                <p className="mt-2 text-sm text-[var(--brand-primary)]/60">
                  {customer.notes || "Inga övriga anteckningar ännu."}
                </p>
              </ListItem>
              <ListItem>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-primary)]/40">
                  Senast klarad follow-up
                </p>
                <p className="mt-2 text-sm text-[var(--brand-primary)]/60">
                  {customer.lastFollowUpCompletedAt || "Ingen follow-up markerad som klar ännu."}
                </p>
              </ListItem>
            </SurfaceList>
          </SectionCard>

          <SectionCard
            title="Relaterade affärer"
            subtitle="Affärer som är kopplade till kunden."
          >
            <SurfaceList>
              {relatedDeals.length === 0 ? (
                <ListItem>
                  <p className="text-sm text-[var(--brand-primary)]/60">
                    Inga affärer är kopplade till kunden ännu.
                  </p>
                </ListItem>
              ) : (
                relatedDeals.map((deal) => (
                  <ListItem key={deal.id} tone={deal.stage === "Vunnen" ? "amber" : "plain"}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--brand-primary)]">
                        {deal.name}
                      </p>
                      <StatusPill tone={deal.stage === "Vunnen" ? "green" : "neutral"}>
                        {deal.stage}
                      </StatusPill>
                    </div>
                    <p className="mt-2 text-sm text-[var(--brand-primary)]/60">
                      {formatCurrency(deal.value)}
                    </p>
                  </ListItem>
                ))
              )}
            </SurfaceList>
          </SectionCard>

          <SectionCard
            title="Relaterade aktiviteter"
            subtitle="Tidigare och kommande kunduppföljningar."
          >
            <SurfaceList>
              {relatedActivities.length === 0 ? (
                <ListItem>
                  <p className="text-sm text-[var(--brand-primary)]/60">
                    Inga aktiviteter är kopplade till kunden ännu.
                  </p>
                </ListItem>
              ) : (
                relatedActivities.map((activity) => (
                  <ListItem key={activity.id} tone={activity.status === "Planerad" ? "amber" : "plain"}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--brand-primary)]">
                        {activity.title}
                      </p>
                      <StatusPill tone={activity.status === "Klar" ? "green" : "amber"}>
                        {activity.status}
                      </StatusPill>
                    </div>
                    <p className="mt-2 text-sm text-[var(--brand-primary)]/60">
                      {activity.dueDate} · {activity.notes || "Ingen anteckning"}
                    </p>
                  </ListItem>
                ))
              )}
            </SurfaceList>
          </SectionCard>
        </div>
      </div>
    </PageStack>
  );
}
