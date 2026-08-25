import { auth } from "@clerk/nextjs/server";
import { updateProfile } from "@/app/actions";
import {
  Field,
  FormGrid,
  PageStack,
  SectionCard,
  Select,
  StatCard,
  SubmitButton,
  Textarea,
} from "@/components/crm-ui";
import { sanitizeCrmRole } from "@/lib/crm-users";
import {
  emailSignatureLogoWidthOptions,
  getDefaultProfile,
  readCrmData,
} from "@/lib/crm-store";

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
          <div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--brand-primary)]/72">
                Signaturlogga
              </span>
              <input
                type="file"
                name="emailSignatureLogo"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="w-full rounded-2xl bg-white/72 px-4 py-3 text-sm text-[var(--brand-primary)] outline-none shadow-[inset_0_0_0_1px_rgba(58,17,98,0.06)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--brand-primary)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              />
            </label>
          </div>
          <Select
            label="Loggstorlek"
            name="emailSignatureLogoWidth"
            options={emailSignatureLogoWidthOptions.map((size) => `${size}`)}
            defaultValue={String(profile.emailSignatureLogoWidth)}
          />
          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-3 text-sm text-[var(--brand-primary)]/72">
              <input
                type="checkbox"
                name="removeEmailSignatureLogo"
                value="yes"
                className="h-4 w-4 rounded border-[var(--brand-primary)]/20"
              />
              Ta bort nuvarande signaturlogga
            </label>
          </div>
          {profile.emailSignatureLogoDataUrl ? (
            <div className="md:col-span-2">
              <p className="mb-3 text-sm font-medium text-[var(--brand-primary)]/72">
                Nuvarande logga
              </p>
              <div className="rounded-2xl bg-white/60 px-4 py-4 shadow-[inset_0_0_0_1px_rgba(58,17,98,0.06)]">
                <img
                  src={profile.emailSignatureLogoDataUrl}
                  alt="Nuvarande signaturlogga"
                  style={{ width: `${profile.emailSignatureLogoWidth}px`, maxWidth: "100%" }}
                />
              </div>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <SubmitButton>Spara profil</SubmitButton>
          </div>
          </FormGrid>
        </form>
      </SectionCard>
    </PageStack>
  );
}
