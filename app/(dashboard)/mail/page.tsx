import { auth } from "@clerk/nextjs/server";
import { CustomerEmailForm } from "@/components/customer-email-form";
import { PageStack, SectionCard } from "@/components/crm-ui";
import { getDefaultProfile, getEmailSignature, readCrmData } from "@/lib/crm-store";

export default async function MailPage() {
  const { userId } = await auth();
  const data = await readCrmData();
  const profile =
    data.profiles.find((item) => item.userId === userId) ??
    getDefaultProfile(userId ?? "anonymous");
  const emailSignature = getEmailSignature(profile);

  return (
    <PageStack>
      <SectionCard
        title="Mailutskick"
        subtitle="Skriv in mottagare manuellt och skicka individuellt via ditt Google-konto."
      >
        <CustomerEmailForm signature={emailSignature} />
      </SectionCard>
    </PageStack>
  );
}
