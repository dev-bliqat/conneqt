import { auth } from "@clerk/nextjs/server";
import { updateProfile } from "@/app/actions";
import {
  Field,
  FormGrid,
  PageStack,
  SectionCard,
  StatCard,
  SubmitButton,
  Textarea,
} from "@/components/crm-ui";
import { sanitizeCrmRole } from "@/lib/crm-users";
import { getDefaultProfile, readCrmData } from "@/lib/crm-store";

export default async function ProfilPage() {
  const { userId } = await auth();
  const data = await readCrmData();
  const profile =
    data.profiles.find((item) => item.userId === userId) ??
    getDefaultProfile(userId ?? "anonymous");
  const role = sanitizeCrmRole(profile.role);
  const ownedLeads = data.leads.filter((item) => item.owner === profile.fullName).length;

  return (
    <PageStack>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Roll"
          value={role || "Ej satt"}
          hint="Nuvarande ansvar i CRM"
          accent="amber"
        />
        <StatCard
          label="Fokus"
          value={profile.focusArea || "Ej satt"}
          hint="Vad du prioriterar just nu"
          accent="soft"
        />
        <StatCard
          label="Senast uppdaterad"
          value={profile.updatedAt.slice(0, 10)}
          hint={`${ownedLeads} leads matchar detta namn som ansvarig`}
          accent="dark"
        />
      </div>

      <SectionCard
        title="Uppdatera profil"
        subtitle="Spara personliga inställningar lokalt i CRM-systemet. Roller sätts via adminsidan."
      >
        <form action={updateProfile}>
          <FormGrid>
          <Field
            label="Fullständigt namn"
            name="fullName"
            defaultValue={profile.fullName}
            placeholder="Josef Handel"
          />
          <div className="md:col-span-2">
            <p className="rounded-2xl border border-[var(--brand-primary)]/10 bg-[var(--brand-lilac)]/12 px-4 py-3 text-sm text-[var(--brand-primary)]/65">
              Din roll är just nu <strong>{role || "Ingen roll"}</strong>. Endast
              `josef@bliqat.se` och `anton@bliqat.se` kan ändra roller på `/admin`.
            </p>
          </div>
          <div className="md:col-span-2">
            <Field
              label="Fokusområde"
              name="focusArea"
              defaultValue={profile.focusArea}
              placeholder="Få fler kvalificerade möten till pipeline"
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              label="Bio / arbetssätt"
              name="bio"
              defaultValue={profile.bio}
              placeholder="Beskriv hur du jobbar eller vad som är viktigt för teamet att veta."
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              label="E-postsignatur"
              name="emailSignature"
              defaultValue={profile.emailSignature}
              placeholder={"Med vanliga halsningar,\nJosef Handel\nBliqat"}
              rows={5}
              className="min-h-[130px]"
            />
          </div>
          <div className="md:col-span-2">
            <SubmitButton>Spara profil</SubmitButton>
          </div>
          </FormGrid>
        </form>
      </SectionCard>
    </PageStack>
  );
}
