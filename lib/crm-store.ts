import { promises as fs } from "node:fs";
import path from "node:path";
import type { PoolClient } from "pg";
import {
  type Activity,
  activityTypes,
  type CalendarMeeting,
  type CrmData,
  customerStatuses,
  dealStages,
  type Deal,
  leadStatuses,
  type Lead,
  type Profile,
} from "@/lib/crm-types";
import { getPgPool } from "@/lib/db";

const dataDirectory = path.join(process.cwd(), "data");
const dataFile = path.join(dataDirectory, "crm.json");
const stateTable = "crm_state";
const stateRowId = "default";

const seedData: CrmData = {
  leads: [
    {
      id: "lead-alpha",
      name: "Anna Berg",
      company: "Northstar Retail",
      email: "anna@northstar.se",
      phone: "+46 70 222 11 33",
      source: "LinkedIn",
      status: "Kontaktad",
      value: 185000,
      nextStep: "Boka demo på fredag",
      notes: "Visat intresse för automatiserad uppföljning.",
      owner: "Josef",
      createdAt: "2026-08-02",
    },
    {
      id: "lead-beta",
      name: "Mikael Sjödin",
      company: "Urban Habitat",
      email: "mikael@urbanhabitat.se",
      phone: "+46 73 818 28 71",
      source: "Referral",
      status: "Kvalificerad",
      value: 265000,
      nextStep: "Skicka offertutkast",
      notes: "Vill börja med ett pilotteam om 10 personer.",
      owner: "Josef",
      createdAt: "2026-08-01",
    },
  ],
  customers: [
    {
      id: "customer-aurora",
      name: "Sara Holm",
      company: "Aurora Studio",
      email: "sara@aurora.studio",
      phone: "+46 76 800 19 11",
      segment: "Tillväxt",
      status: "Konto skapat",
      statusNotes: "Bra momentum och positiv återkoppling från senaste avstämningen.",
      city: "Stockholm",
      notes: "Månadsvisa avstämningar och tydlig expansionplan.",
      followUpDate: "2026-08-12",
      followUpAction: "Ring Sara och bekräfta Q4-prioriteringar samt nästa beslutspunkt.",
      lastFollowUpCompletedAt: "",
      wonAt: "",
      wonValue: 0,
      owner: "Josef",
      createdAt: "2026-07-15",
    },
  ],
  deals: [
    {
      id: "deal-aurora-renewal",
      name: "Aurora Studio Q4-utökning",
      company: "Aurora Studio",
      stage: "Förhandling",
      value: 142000,
      owner: "Josef",
      expectedCloseDate: "2026-08-20",
      sourceLeadId: null,
      customerId: "customer-aurora",
      createdAt: "2026-07-28",
      updatedAt: "2026-08-05",
    },
    {
      id: "deal-urbanhabitat",
      name: "Urban Habitat pilot",
      company: "Urban Habitat",
      stage: "Offert",
      value: 265000,
      owner: "Josef",
      expectedCloseDate: "2026-08-18",
      sourceLeadId: "lead-beta",
      customerId: null,
      createdAt: "2026-08-03",
      updatedAt: "2026-08-05",
    },
  ],
  activities: [
    {
      id: "activity-anna-demo",
      title: "Förbered demo för Northstar Retail",
      type: "Möte",
      status: "Planerad",
      dueDate: "2026-08-07",
      owner: "Josef",
      relatedType: "lead",
      relatedId: "lead-alpha",
      notes: "Visa pipeline och aktivitetsöversikt.",
      createdAt: "2026-08-05",
    },
    {
      id: "activity-aurora-followup",
      title: "Följ upp med Aurora efter avtalsutkast",
      type: "Samtal",
      status: "Planerad",
      dueDate: "2026-08-08",
      owner: "Josef",
      relatedType: "customer",
      relatedId: "customer-aurora",
      notes: "Bekräfta prioriterade moduler inför Q4.",
      createdAt: "2026-08-05",
    },
  ],
  calendarMeetings: [],
  profiles: [],
};

async function ensureDataFile() {
  await fs.mkdir(dataDirectory, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(seedData, null, 2), "utf8");
  }
}

function normalizeCrmData(parsed: CrmData): CrmData {
  return {
    ...parsed,
    customers: parsed.customers.map((customer) => ({
      ...customer,
      status:
        customer.status === ""
          ? ""
          : customerStatuses.includes(customer.status as (typeof customerStatuses)[number])
            ? (customer.status as (typeof customerStatuses)[number])
            : "Ska boka nytt möte",
      statusNotes: customer.statusNotes ?? "",
      notes: customer.notes ?? "",
      followUpDate: customer.followUpDate ?? "",
      followUpAction: customer.followUpAction ?? "",
      lastFollowUpCompletedAt: customer.lastFollowUpCompletedAt ?? "",
      wonAt: customer.wonAt ?? "",
      wonValue: customer.wonValue ?? 0,
    })),
    calendarMeetings: (parsed.calendarMeetings ?? []).map((meeting) => ({
      ...meeting,
      customerId: meeting.customerId ?? null,
      leadId: meeting.leadId ?? null,
      dealId: meeting.dealId ?? null,
      description: meeting.description ?? "",
      location: meeting.location ?? "",
      htmlLink: meeting.htmlLink ?? "",
      status: meeting.status ?? "confirmed",
      lastSyncedAt: meeting.lastSyncedAt ?? new Date().toISOString(),
      updatedAt: meeting.updatedAt ?? new Date().toISOString(),
    })),
    profiles: (parsed.profiles ?? []).map((profile) => ({
      ...getDefaultProfile(profile.userId),
      ...profile,
      emailSignature: profile.emailSignature ?? "",
      updatedAt: profile.updatedAt ?? new Date().toISOString(),
    })),
  };
}

async function getInitialCrmData() {
  await ensureDataFile();
  const raw = await fs.readFile(dataFile, "utf8");
  return normalizeCrmData(JSON.parse(raw) as CrmData);
}

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

async function ensureDatabaseState(client?: PoolClient) {
  const db = client ?? getPgPool();

  await db.query(`
    create table if not exists ${stateTable} (
      id text primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);

  const existing = await db.query(
    `select id from ${stateTable} where id = $1`,
    [stateRowId],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    return;
  }

  const initialData = await getInitialCrmData();
  await db.query(
    `insert into ${stateTable} (id, data, updated_at) values ($1, $2::jsonb, now())`,
    [stateRowId, JSON.stringify(initialData)],
  );
}

export async function readCrmData(): Promise<CrmData> {
  if (!hasDatabaseUrl()) {
    await ensureDataFile();
    const raw = await fs.readFile(dataFile, "utf8");
    return normalizeCrmData(JSON.parse(raw) as CrmData);
  }

  await ensureDatabaseState();
  const pool = getPgPool();
  const result = await pool.query(
    `select data from ${stateTable} where id = $1`,
    [stateRowId],
  );

  return normalizeCrmData(result.rows[0].data as CrmData);
}

export async function writeCrmData(data: CrmData) {
  if (!hasDatabaseUrl()) {
    await ensureDataFile();
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2), "utf8");
    return;
  }

  await ensureDatabaseState();
  const pool = getPgPool();
  await pool.query(
    `update ${stateTable} set data = $2::jsonb, updated_at = now() where id = $1`,
    [stateRowId, JSON.stringify(normalizeCrmData(data))],
  );
}

export async function updateCrmData(
  updater: (current: CrmData) => CrmData | Promise<CrmData>,
) {
  if (!hasDatabaseUrl()) {
    const current = await readCrmData();
    const next = await updater(current);
    await writeCrmData(next);
    return next;
  }

  const pool = getPgPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    await ensureDatabaseState(client);

    const result = await client.query(
      `select data from ${stateTable} where id = $1 for update`,
      [stateRowId],
    );
    const current = normalizeCrmData(result.rows[0].data as CrmData);
    const next = normalizeCrmData(await updater(current));

    await client.query(
      `update ${stateTable} set data = $2::jsonb, updated_at = now() where id = $1`,
      [stateRowId, JSON.stringify(next)],
    );
    await client.query("commit");
    return next;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export function getLeadStatusIndex(status: Lead["status"]) {
  return leadStatuses.indexOf(status);
}

export function getNextLeadStatus(status: Lead["status"]) {
  const index = getLeadStatusIndex(status);
  return leadStatuses[Math.min(index + 1, leadStatuses.length - 1)];
}

export function getDealStageIndex(stage: Deal["stage"]) {
  return dealStages.indexOf(stage);
}

export function getNextDealStage(stage: Deal["stage"]) {
  const index = getDealStageIndex(stage);
  return dealStages[Math.min(index + 1, dealStages.length - 1)];
}

export function getDefaultProfile(userId: string): Profile {
  return {
    userId,
    fullName: "",
    role: "Ingen roll",
    focusArea: "Prioritera varma leads och skapa struktur i pipeline.",
    bio: "",
    emailSignature: "",
    updatedAt: new Date().toISOString(),
  };
}

export function getEmailSignature(profile: Pick<Profile, "fullName" | "emailSignature">) {
  if (profile.emailSignature.trim()) {
    return profile.emailSignature.trim();
  }

  const name = profile.fullName.trim() || "Avsändare";

  return [
    "Med vänliga hälsningar,",
    name,
    "Bliqat",
  ].join("\n");
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getRelatedLabel(
  activity: Activity,
  data: Pick<CrmData, "leads" | "customers" | "deals">,
) {
  if (activity.relatedType === "lead") {
    return data.leads.find((item) => item.id === activity.relatedId)?.company;
  }

  if (activity.relatedType === "customer") {
    return data.customers.find((item) => item.id === activity.relatedId)?.company;
  }

  if (activity.relatedType === "deal") {
    return data.deals.find((item) => item.id === activity.relatedId)?.name;
  }

  return "Allmänt";
}

export function getCalendarMeetingRelationLabel(
  meeting: CalendarMeeting,
  data: Pick<CrmData, "leads" | "customers" | "deals">,
) {
  if (meeting.customerId) {
    return data.customers.find((item) => item.id === meeting.customerId)?.company;
  }

  if (meeting.leadId) {
    return data.leads.find((item) => item.id === meeting.leadId)?.company;
  }

  if (meeting.dealId) {
    return data.deals.find((item) => item.id === meeting.dealId)?.name;
  }

  return "Ej kopplad";
}

export function sortByDateDescending<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function sortActivities(items: Activity[]) {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "Planerad" ? -1 : 1;
    }

    return a.dueDate.localeCompare(b.dueDate);
  });
}

export function sortCalendarMeetings(items: CalendarMeeting[]) {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === "confirmed") {
        return -1;
      }

      if (b.status === "confirmed") {
        return 1;
      }
    }

    return a.startAt.localeCompare(b.startAt);
  });
}

export function sanitizeActivityType(value: string) {
  return activityTypes.includes(value as (typeof activityTypes)[number])
    ? (value as Activity["type"])
    : "Uppgift";
}

export function sanitizeLeadStatus(value: string) {
  return leadStatuses.includes(value as (typeof leadStatuses)[number])
    ? (value as Lead["status"])
    : "Ny";
}

export function sanitizeDealStage(value: string) {
  return dealStages.includes(value as (typeof dealStages)[number])
    ? (value as Deal["stage"])
    : "Prospekt";
}
