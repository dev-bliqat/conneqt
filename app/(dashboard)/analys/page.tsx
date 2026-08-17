import {
  ListItem,
  PageStack,
  SectionCard,
  StatCard,
  StatusPill,
  SurfaceList,
} from "@/components/crm-ui";
import { formatCurrency, readCrmData } from "@/lib/crm-store";
import { dealStages, leadStatuses } from "@/lib/crm-types";

export default async function AnalysPage() {
  const data = await readCrmData();
  const wonLeads = data.leads.filter((item) => item.status === "Vunnen").length;
  const conversionRate =
    data.leads.length === 0 ? 0 : Math.round((wonLeads / data.leads.length) * 100);
  const wonDealValue = data.deals
    .filter((item) => item.stage === "Vunnen")
    .reduce((sum, deal) => sum + deal.value, 0);
  const avgLeadValue =
    data.leads.length === 0
      ? 0
      : Math.round(
          data.leads.reduce((sum, lead) => sum + lead.value, 0) / data.leads.length,
        );

  return (
    <PageStack>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Konvertering"
          value={`${conversionRate}%`}
          hint="Leads som hittills blivit vunna"
          accent="amber"
        />
        <StatCard
          label="Snittlead"
          value={formatCurrency(avgLeadValue)}
          hint="Genomsnittligt estimerat leadvärde"
          accent="soft"
        />
        <StatCard
          label="Vunnet affärsvärde"
          value={formatCurrency(wonDealValue)}
          hint="Summerat från vunna affärer"
          accent="dark"
        />
        <StatCard
          label="Öppna aktiviteter"
          value={String(data.activities.filter((item) => item.status === "Planerad").length)}
          hint="Arbete kvar i nuvarande period"
          accent="soft"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Leadstatus"
          subtitle="Fördelning av leads genom kvalificeringsflödet."
        >
          <SurfaceList>
            {leadStatuses.map((status) => {
              const count = data.leads.filter((lead) => lead.status === status).length;
              const width = data.leads.length === 0 ? 0 : (count / data.leads.length) * 100;

              return (
                <ListItem key={status} tone={count > 0 ? "amber" : "plain"}>
                  <div className="mb-2 flex items-center justify-between text-sm text-black/65">
                    <div className="flex items-center gap-2">
                      <span>{status}</span>
                      <StatusPill tone={count > 0 ? "amber" : "neutral"}>{count}</StatusPill>
                    </div>
                    <span>{data.leads.length === 0 ? "0%" : `${Math.round(width)}%`}</span>
                  </div>
                  <div className="h-3 rounded-full bg-black/8">
                    <div
                      className="h-3 rounded-full bg-[#f4b65f]"
                      style={{ width: `${Math.max(width, count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </ListItem>
              );
            })}
          </SurfaceList>
        </SectionCard>

        <SectionCard
          title="Pipeline per steg"
          subtitle="Hur mycket värde som ligger i varje del av affärsprocessen."
        >
          <SurfaceList>
            {dealStages.map((stage) => {
              const deals = data.deals.filter((deal) => deal.stage === stage);
              const total = deals.reduce((sum, deal) => sum + deal.value, 0);

              return (
                <ListItem key={stage} tone={stage === "Förhandling" ? "amber" : "plain"}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-black">{stage}</p>
                      <StatusPill tone={stage === "Vunnen" ? "green" : "neutral"}>
                        {deals.length} affärer
                      </StatusPill>
                    </div>
                    <p className="text-sm text-black/60">{deals.length === 0 ? "Tomt" : "Aktivt"}</p>
                  </div>
                  <p className="mt-3 text-xl font-semibold text-black">
                    {formatCurrency(total)}
                  </p>
                </ListItem>
              );
            })}
          </SurfaceList>
        </SectionCard>
      </div>
    </PageStack>
  );
}
