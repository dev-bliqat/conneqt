import { advanceDealStage, createDeal } from "@/app/actions";
import {
  Field,
  FormGrid,
  ListItem,
  OwnerSelect,
  PageStack,
  SectionCard,
  Select,
  StatusPill,
  SubmitButton,
  SurfaceList,
} from "@/components/crm-ui";
import { getSellerOwnerOptions } from "@/lib/crm-users";
import { formatCurrency, readCrmData } from "@/lib/crm-store";
import { dealStages } from "@/lib/crm-types";

export default async function PipelinePage() {
  const [data, ownerOptions] = await Promise.all([
    readCrmData(),
    getSellerOwnerOptions(),
  ]);

  return (
    <PageStack>
      <div>
        <SectionCard
          title="Ny affär"
          subtitle="Skapa en affär direkt eller koppla den till befintlig lead eller kund."
        >
          <form action={createDeal}>
            <FormGrid columns="four">
            <Field label="Affärsnamn" name="name" placeholder="Aurora Q4-utökning" />
            <Field label="Bolag" name="company" placeholder="Aurora Studio" />
            <Field label="Värde (SEK)" name="value" type="number" placeholder="150000" />
            <Select label="Steg" name="stage" options={[...dealStages]} />
            <Field label="Stängdatum" name="expectedCloseDate" type="date" />
            <OwnerSelect options={ownerOptions} />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-black/70">Lead</span>
              <select
                name="sourceLeadId"
                defaultValue=""
                className="w-full rounded-2xl border border-black/10 bg-[#fcfbf8] px-4 py-3 text-sm text-black outline-none transition focus:border-black/30"
              >
                <option value="">Ingen lead</option>
                {data.leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.company}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-black/70">Kund</span>
              <select
                name="customerId"
                defaultValue=""
                className="w-full rounded-2xl border border-black/10 bg-[#fcfbf8] px-4 py-3 text-sm text-black outline-none transition focus:border-black/30"
              >
                <option value="">Ingen kund</option>
                {data.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company}
                  </option>
                ))}
              </select>
            </label>
            <div className="xl:col-span-4">
              <SubmitButton>Spara affär</SubmitButton>
            </div>
            </FormGrid>
          </form>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {dealStages.map((stage) => {
          const deals = data.deals.filter((deal) => deal.stage === stage);
          const total = deals.reduce((sum, deal) => sum + deal.value, 0);

          return (
            <section
              key={stage}
              className="rounded-[1.45rem] border border-black/10 bg-white p-4 shadow-[0_18px_40px_rgba(0,0,0,0.05)]"
            >
              <div className="mb-4">
                <p className="text-sm font-semibold text-black">{stage}</p>
                <p className="mt-1 text-sm text-black/55">
                  {deals.length} affärer · {formatCurrency(total)}
                </p>
              </div>
              <SurfaceList>
                {deals.map((deal) => (
                  <ListItem key={deal.id} tone={stage === "Förhandling" ? "amber" : "plain"}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-black">{deal.name}</p>
                      <StatusPill tone={stage === "Vunnen" ? "green" : "neutral"}>
                        {deal.owner}
                      </StatusPill>
                    </div>
                    <p className="mt-1 text-sm text-black/55">{deal.company}</p>
                    <p className="mt-3 text-base font-semibold text-black">
                      {formatCurrency(deal.value)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-black/40">
                      Stänger {deal.expectedCloseDate}
                    </p>
                    {stage !== "Vunnen" ? (
                      <form action={advanceDealStage} className="mt-4">
                        <input type="hidden" name="dealId" value={deal.id} />
                        <button className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black transition hover:border-black/20 hover:bg-black/5">
                          Flytta till nästa steg
                        </button>
                      </form>
                    ) : null}
                  </ListItem>
                ))}
              </SurfaceList>
            </section>
          );
        })}
      </div>
    </PageStack>
  );
}
