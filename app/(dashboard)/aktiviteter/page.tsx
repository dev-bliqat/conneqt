import { auth } from "@clerk/nextjs/server";
import { createActivity, toggleActivityStatus } from "@/app/actions";
import { CalendarView } from "@/components/calendar-view";
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
  Textarea,
} from "@/components/crm-ui";
import { getSellerOwnerOptions } from "@/lib/crm-users";
import { getGoogleCalendarEventsForUser } from "@/lib/google-calendar";
import {
  getRelatedLabel,
  readCrmData,
  sortActivities,
  sortCalendarMeetings,
} from "@/lib/crm-store";
import { activityTypes } from "@/lib/crm-types";

export default async function AktiviteterPage() {
  const { userId } = await auth();
  const [data, ownerOptions] = await Promise.all([
    readCrmData(),
    getSellerOwnerOptions(),
  ]);
  const googleCalendar = userId ? await getGoogleCalendarEventsForUser(userId) : null;
  const relatedOptions = [
    { label: "Allmänt", value: "general:" },
    ...data.leads.map((lead) => ({
      label: `Lead · ${lead.company}`,
      value: `lead:${lead.id}`,
    })),
    ...data.customers.map((customer) => ({
      label: `Kund · ${customer.company}`,
      value: `customer:${customer.id}`,
    })),
    ...data.deals.map((deal) => ({
      label: `Affär · ${deal.name}`,
      value: `deal:${deal.id}`,
    })),
  ];

  return (
    <PageStack>
      <CalendarView
        calendarState={googleCalendar}
        meetings={sortCalendarMeetings(data.calendarMeetings)}
        data={data}
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Ny aktivitet"
          subtitle="Skapa uppföljning, möte eller uppgift kopplad till rätt relation."
        >
          <form
            action={async (formData) => {
              "use server";
              const combined = String(formData.get("related") ?? "general:");
              const [relatedType, relatedId] = combined.split(":");
              formData.set("relatedType", relatedType || "general");
              formData.set("relatedId", relatedId || "");
              await createActivity(formData);
            }}
          >
            <FormGrid>
              <div className="md:col-span-2">
                <Field
                  label="Titel"
                  name="title"
                  placeholder="Ring kund om nästa steg"
                />
              </div>
              <Select label="Typ" name="type" options={[...activityTypes]} />
              <Field label="Datum" name="dueDate" type="date" />
              <OwnerSelect options={ownerOptions} />
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-black/70">
                  Koppla till
                </span>
                <select
                  name="related"
                  className="w-full rounded-2xl border border-black/10 bg-[#fcfbf8] px-4 py-3 text-sm text-black outline-none transition focus:border-black/30"
                  defaultValue="general:"
                >
                  {relatedOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2">
                <Textarea
                  label="Anteckningar"
                  name="notes"
                  placeholder="Vad behöver göras eller förberedas?"
                />
              </div>
              <div className="md:col-span-2">
                <SubmitButton>Spara aktivitet</SubmitButton>
              </div>
            </FormGrid>
          </form>
        </SectionCard>

        <SectionCard
          title="CRM-aktiviteter"
          subtitle="Planerade och slutförda aktiviteter i samma arbetsflöde."
        >
          <SurfaceList>
            {sortActivities(data.activities).map((activity) => (
              <ListItem
                key={activity.id}
                tone={activity.status === "Planerad" ? "amber" : "plain"}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-black">
                        {activity.title}
                      </p>
                      <StatusPill
                        tone={activity.status === "Klar" ? "green" : "amber"}
                      >
                        {activity.status}
                      </StatusPill>
                    </div>
                    <p className="mt-1 text-sm text-black/55">
                      {activity.type} · {activity.dueDate}
                    </p>
                  </div>
                  <StatusPill>{getRelatedLabel(activity, data)}</StatusPill>
                </div>
                {activity.notes ? (
                  <p className="mt-3 text-sm text-black/60">{activity.notes}</p>
                ) : null}
                <form action={toggleActivityStatus} className="mt-4">
                  <input type="hidden" name="activityId" value={activity.id} />
                  <button className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black transition hover:border-black/20 hover:bg-black/5">
                    {activity.status === "Planerad"
                      ? "Markera som klar"
                      : "Återöppna aktivitet"}
                  </button>
                </form>
              </ListItem>
            ))}
          </SurfaceList>
        </SectionCard>
      </div>
    </PageStack>
  );
}
