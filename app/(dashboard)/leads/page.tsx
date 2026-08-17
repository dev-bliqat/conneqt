import { advanceLeadStatus, convertLeadToCustomer, createLead } from "@/app/actions";
import {
  Field,
  FormGrid,
  Kicker,
  ListItem,
  OwnerSelect,
  PageStack,
  SectionCard,
  Select,
  StatusPill,
  SubmitButton,
  SurfaceList,
  Textarea,
} from "@/components/crm-ui";
import { getSellerOwnerOptions } from "@/lib/crm-users";
import { formatCurrency, readCrmData, sortByDateDescending } from "@/lib/crm-store";
import { leadStatuses } from "@/lib/crm-types";

export default async function LeadsPage() {
  const [data, ownerOptions] = await Promise.all([
    readCrmData(),
    getSellerOwnerOptions(),
  ]);

  return (
    <PageStack>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Skapa lead"
          subtitle="Lägg in ny kontakt, uppskattat värde och nästa steg direkt."
        >
          <form action={createLead}>
            <FormGrid>
            <Field label="Kontaktperson" name="name" placeholder="Anna Berg" />
            <Field label="Bolag" name="company" placeholder="Northstar Retail" />
            <Field label="E-post" name="email" type="email" placeholder="anna@bolag.se" />
            <Field label="Telefon" name="phone" placeholder="+46 70 000 00 00" />
            <Field label="Källa" name="source" placeholder="LinkedIn, referral..." />
            <Field label="Värde (SEK)" name="value" type="number" placeholder="125000" />
            <Select label="Status" name="status" options={[...leadStatuses]} />
            <OwnerSelect options={ownerOptions} />
            <div className="md:col-span-2">
              <Field
                label="Nästa steg"
                name="nextStep"
                placeholder="Boka intro, skicka offert..."
              />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Anteckningar"
                name="notes"
                placeholder="Vad är viktigt att komma ihåg?"
              />
            </div>
            <div className="md:col-span-2">
              <SubmitButton>Spara lead</SubmitButton>
            </div>
            </FormGrid>
          </form>
        </SectionCard>

        <SectionCard
          title="Leadlista"
          subtitle="Driv varje lead framåt eller konvertera när affären är redo."
        >
          <SurfaceList>
            {sortByDateDescending(data.leads).map((lead) => (
              <ListItem key={lead.id} tone={lead.status === "Kvalificerad" ? "amber" : "plain"}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-black">{lead.company}</p>
                      <StatusPill tone={lead.status === "Vunnen" ? "green" : "amber"}>
                        {lead.status}
                      </StatusPill>
                    </div>
                    <p className="text-sm text-black/55">
                      {lead.name} · {lead.email || "Ingen e-post"} · {lead.phone || "Ingen telefon"}
                    </p>
                  </div>
                  <div className="text-right">
                    <Kicker>{lead.source || "Manuell"}</Kicker>
                    <p className="mt-1 text-base font-semibold text-black">
                      {formatCurrency(lead.value)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                      Nästa steg
                    </p>
                    <p className="mt-2 text-sm text-black/60">
                      {lead.nextStep || "Inget nästa steg satt."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                      Anteckningar
                    </p>
                    <p className="mt-2 text-sm text-black/45">
                      {lead.notes || "Inga anteckningar ännu."}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <form action={advanceLeadStatus}>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <button className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black transition hover:border-black/20 hover:bg-black/5">
                      Flytta status
                    </button>
                  </form>
                  <form action={convertLeadToCustomer}>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <button className="rounded-full bg-[#f4b65f] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#e5a84f]">
                      Konvertera till kund
                    </button>
                  </form>
                </div>
              </ListItem>
            ))}
          </SurfaceList>
        </SectionCard>
      </div>
    </PageStack>
  );
}
