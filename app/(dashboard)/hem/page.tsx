import Link from "next/link";
import {
  Kicker,
  ListItem,
  PageStack,
  SectionCard,
  StatCard,
  StatusPill,
  SurfaceList,
} from "@/components/crm-ui";
import type { Activity } from "@/lib/crm-types";
import {
  formatCurrency,
  readCrmData,
  sortActivities,
  sortByDateDescending,
} from "@/lib/crm-store";

function getActivityHref(activity: Activity) {
  if (activity.relatedType === "customer" && activity.relatedId) {
    return `/kunder/${activity.relatedId}`;
  }

  if (activity.relatedType === "lead" && activity.relatedId) {
    return `/leads#lead-${activity.relatedId}`;
  }

  if (activity.relatedType === "deal" && activity.relatedId) {
    return `/pipeline#deal-${activity.relatedId}`;
  }

  return `/aktiviteter#activity-${activity.id}`;
}

export default async function HemPage() {
  const data = await readCrmData();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const plannedActivities = data.activities.filter((item) => item.status === "Planerad");
  const openDeals = data.deals.filter((item) => item.stage !== "Vunnen");
  const hotLeads = data.leads.filter(
    (item) => item.status === "Kontaktad" || item.status === "Kvalificerad",
  );
  const pipelineValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);
  const wonCustomersThisMonth = data.customers.filter((customer) => {
    if (!customer.wonAt || customer.status !== "Betalande kund") {
      return false;
    }

    const wonDate = new Date(customer.wonAt);
    return wonDate.getFullYear() === currentYear && wonDate.getMonth() === currentMonth;
  });
  const wonCustomerValueThisMonth = wonCustomersThisMonth.reduce(
    (sum, customer) => sum + customer.wonValue,
    0,
  );
  const sellerLeaderboard = wonCustomersThisMonth.reduce<Record<string, number>>(
    (accumulator, customer) => {
      const owner = customer.owner || "Okänd";
      accumulator[owner] = (accumulator[owner] ?? 0) + customer.wonValue;
      return accumulator;
    },
    {},
  );
  const leadingSellerEntry = Object.entries(sellerLeaderboard).sort(
    (left, right) => right[1] - left[1],
  )[0];
  const leadingSellerName = leadingSellerEntry?.[0] ?? "Ingen ännu";
  const leadingSellerValue = leadingSellerEntry?.[1] ?? 0;

  return (
    <PageStack>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="Leads"
          value={String(data.leads.length)}
          hint={`${hotLeads.length} är varma just nu`}
          accent="amber"
        />
        <StatCard
          label="Kunder"
          value={String(data.customers.length)}
          hint="Aktiva relationer i CRM"
          accent="soft"
        />
        <StatCard
          label="Aktiviteter"
          value={String(plannedActivities.length)}
          hint="Planerade uppföljningar"
          accent="dark"
        />
        <StatCard
          label="Pipelinevärde"
          value={formatCurrency(pipelineValue)}
          hint={`${openDeals.length} öppna affärer`}
          accent="soft"
        />
        <StatCard
          label="Kundvärde denna månad"
          value={formatCurrency(wonCustomerValueThisMonth)}
          hint={`${wonCustomersThisMonth.length} vunna kunder i aktuell månad`}
          accent="dark"
        />
        <StatCard
          label="Ledande säljare"
          value={leadingSellerName}
          hint={
            leadingSellerValue > 0
              ? `${formatCurrency(leadingSellerValue)} vunnet denna månad`
              : "Ingen vunnen kund registrerad ännu denna månad"
          }
          accent="amber"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Senaste leads"
          subtitle="Nya och prioriterade leads som behöver rörelse framåt."
        >
          <SurfaceList>
            {sortByDateDescending(data.leads)
              .slice(0, 5)
              .map((lead) => (
                <ListItem key={lead.id} tone="amber">
                  <Link
                    href={`/leads#lead-${lead.id}`}
                    className="block rounded-2xl px-3 py-3 transition hover:bg-[var(--brand-lilac)]/10"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-black">{lead.company}</p>
                          <StatusPill tone="amber">{lead.status}</StatusPill>
                        </div>
                        <p className="mt-2 text-sm text-black/55">{lead.name}</p>
                      </div>
                      <p className="text-sm font-medium text-black/65">
                        {formatCurrency(lead.value)}
                      </p>
                    </div>
                    <div className="mt-4">
                      <Kicker>Nästa steg</Kicker>
                      <p className="mt-2 text-sm text-black/60">{lead.nextStep}</p>
                    </div>
                  </Link>
                </ListItem>
              ))}
          </SurfaceList>
        </SectionCard>

        <SectionCard
          title="Kommande aktiviteter"
          subtitle="Nästa kontaktpunkter sorterade för fokus och tempo."
        >
          <SurfaceList>
            {sortActivities(plannedActivities)
              .slice(0, 6)
              .map((activity) => (
                <ListItem key={activity.id}>
                  <Link
                    href={getActivityHref(activity)}
                    className="block rounded-2xl px-3 py-3 transition hover:bg-[var(--brand-lilac)]/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-black">{activity.title}</p>
                      <StatusPill>{activity.type}</StatusPill>
                    </div>
                    <p className="mt-2 text-sm text-black/55">
                      Förfallodatum {activity.dueDate}
                    </p>
                  </Link>
                </ListItem>
              ))}
          </SurfaceList>
        </SectionCard>
      </div>
    </PageStack>
  );
}
