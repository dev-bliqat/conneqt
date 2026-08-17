import { redirect } from "next/navigation";
import { updateUserRole } from "@/app/actions";
import {
  FormGrid,
  PageStack,
  SectionCard,
  Select,
  StatCard,
  SubmitButton,
} from "@/components/crm-ui";
import {
  CRM_ADMIN_EMAIL,
  CRM_ROLE_OPTIONS,
  CRM_ROLE_SELLER,
  getCrmUserDirectory,
  getCurrentUserAdminState,
} from "@/lib/crm-users";

export default async function AdminPage() {
  const currentUser = await getCurrentUserAdminState();

  if (!currentUser.userId) {
    redirect("/");
  }

  if (!currentUser.isAdmin) {
    redirect("/hem");
  }

  const directory = await getCrmUserDirectory();
  const sellers = directory.filter((user) => user.role === CRM_ROLE_SELLER);

  return (
    <main className="flex flex-1 bg-[radial-gradient(circle_at_top_left,_rgba(212,178,231,0.42),_transparent_20%),radial-gradient(circle_at_bottom_right,_rgba(233,87,59,0.18),_transparent_26%),linear-gradient(180deg,_#ece6db_0%,_#f7f0e8_100%)] px-4 py-4 md:px-6 md:py-6">
      <div className="min-h-[calc(100vh-7.5rem)] w-full rounded-[2rem] border border-[var(--brand-primary)]/10 bg-[rgba(255,255,255,0.7)] p-4 shadow-[0_24px_70px_rgba(58,17,98,0.09)] backdrop-blur md:p-6">
        <div className="min-w-0 rounded-[1.8rem] border border-[var(--brand-primary)]/8 bg-[linear-gradient(180deg,_rgba(255,255,255,0.95)_0%,_rgba(255,248,252,0.92)_100%)] p-4 md:p-5">
          <PageStack>
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="Admin"
                value={CRM_ADMIN_EMAIL}
                hint="Endast denna e-postadress får ändra CRM-roller."
                accent="amber"
              />
              <StatCard
                label="Användare"
                value={String(directory.length)}
                hint="Konton hämtade från Clerk."
                accent="soft"
              />
              <StatCard
                label="Säljare"
                value={String(sellers.length)}
                hint="Dessa visas som val i Ansvarig-fälten."
                accent="dark"
              />
            </div>

            <SectionCard
              title="Administrera roller"
              subtitle="Sätt vilka användare som ska kunna väljas som ansvariga i CRM-systemet."
            >
              <div className="space-y-4">
                {directory.map((user) => (
                  <form
                    key={user.userId}
                    action={updateUserRole}
                    className="rounded-[1.35rem] border border-[var(--brand-primary)]/10 bg-white px-5 py-5"
                  >
                    <input type="hidden" name="userId" value={user.userId} />
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[var(--brand-primary)]">
                          {user.fullName}
                        </p>
                        <p className="text-sm text-[var(--brand-primary)]/55">{user.email}</p>
                      </div>
                      <div className="rounded-full border border-[var(--brand-primary)]/10 bg-[var(--brand-lilac)]/12 px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)]/65">
                        {user.isAdmin ? "Systemadmin" : "CRM-användare"}
                      </div>
                    </div>

                    <FormGrid>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-[var(--brand-primary)]/72">
                          Visningsnamn
                        </span>
                        <input
                          className="w-full rounded-2xl border border-[var(--brand-primary)]/10 bg-white/80 px-4 py-3 text-sm text-[var(--brand-primary)] outline-none transition placeholder:text-[var(--brand-primary)]/35 focus:border-[var(--brand-coral)] focus:bg-white"
                          name="fullName"
                          defaultValue={user.fullName}
                          placeholder="Skriv namn som ska visas i CRM"
                        />
                      </label>
                      <Select
                        label="Roll"
                        name="role"
                        options={[...CRM_ROLE_OPTIONS]}
                        defaultValue={user.role}
                      />
                      <div className="md:col-span-2 flex justify-end">
                        <SubmitButton>Spara roll</SubmitButton>
                      </div>
                    </FormGrid>
                  </form>
                ))}
              </div>
            </SectionCard>
          </PageStack>
        </div>
      </div>
    </main>
  );
}
