"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  getDefaultProfile,
  getNextDealStage,
  getNextLeadStatus,
  sanitizeActivityType,
  sanitizeDealStage,
  sanitizeLeadStatus,
  readCrmData,
  updateCrmData,
} from "@/lib/crm-store";
import type { Activity, Customer, Deal, Lead } from "@/lib/crm-types";
import { customerStatuses } from "@/lib/crm-types";
import {
  CRM_ROLE_NONE,
  requireCrmAdmin,
  sanitizeCrmRole,
  getCrmUserDirectory,
} from "@/lib/crm-users";
import {
  createGoogleCalendarMeetingForUser,
  syncGoogleCalendarMeetingsForUser,
  updateGoogleCalendarMeetingForUser,
} from "@/lib/google-calendar";
import type { CalendarMeeting } from "@/lib/crm-types";

const crmPaths = [
  "/hem",
  "/leads",
  "/analys",
  "/aktiviteter",
  "/kunder",
  "/pipeline",
  "/profil",
  "/admin",
];

function revalidateCrm() {
  for (const path of crmPaths) {
    revalidatePath(path);
  }
}

function revalidateCustomerPath(customerId: string) {
  revalidatePath(`/kunder/${customerId}`);
}

async function requireUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

function asString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function asNumber(formData: FormData, key: string) {
  const parsed = Number(String(formData.get(key) ?? "0").replace(/\s/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeCustomerStatus(value: string) {
  return customerStatuses.includes(value as (typeof customerStatuses)[number])
    ? (value as (typeof customerStatuses)[number])
    : "Ska boka nytt möte";
}

async function sanitizeOwnerSelection(selectedOwner: string, fallbackUserId: string) {
  const directory = await getCrmUserDirectory();
  const sellerNames = directory
    .filter((user) => user.role === "Säljare")
    .map((user) => user.ownerName);

  if (selectedOwner && sellerNames.includes(selectedOwner)) {
    return selectedOwner;
  }

  const currentUser = directory.find((user) => user.userId === fallbackUserId);

  if (currentUser?.role === "Säljare" && sellerNames.includes(currentUser.ownerName)) {
    return currentUser.ownerName;
  }

  return sellerNames[0] ?? currentUser?.ownerName ?? fallbackUserId;
}

function parseMeetingDate(formData: FormData, dateKey: string, timeKey: string) {
  const date = asString(formData, dateKey);
  const time = asString(formData, timeKey) || "09:00";

  if (!date) {
    return "";
  }

  return `${date}T${time}`;
}

function parseMeetingRelation(formData: FormData) {
  const relation = asString(formData, "relation");
  const [customerId = "", leadId = "", dealId = ""] = relation.split("|");

  return {
    customerId: customerId || null,
    leadId: leadId || null,
    dealId: dealId || null,
  };
}

function isCalendarConnectionIssue(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return [
    "Google",
    "kalenderåtkomst",
    "anslutning",
    "Kalender",
  ].some((fragment) => error.message.includes(fragment));
}

function buildLocalCalendarMeeting({
  userId,
  summary,
  description,
  location,
  startAt,
  endAt,
  customerId,
  leadId,
  dealId,
  existing,
}: {
  userId: string;
  summary: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  customerId: string | null;
  leadId: string | null;
  dealId: string | null;
  existing?: CalendarMeeting;
}): CalendarMeeting {
  const now = new Date().toISOString();

  return {
    id: existing?.id ?? crypto.randomUUID(),
    googleEventId: existing?.googleEventId ?? `local:${crypto.randomUUID()}`,
    provider: "google",
    ownerUserId: userId,
    customerId,
    leadId,
    dealId,
    summary,
    description,
    location,
    startAt,
    endAt,
    status: "Behöver Google",
    htmlLink: "",
    lastSyncedAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function createLead(formData: FormData) {
  const userId = await requireUser();
  const owner = await sanitizeOwnerSelection(asString(formData, "owner"), userId);

  const lead: Lead = {
    id: crypto.randomUUID(),
    name: asString(formData, "name"),
    company: asString(formData, "company"),
    email: asString(formData, "email"),
    phone: asString(formData, "phone"),
    source: asString(formData, "source") || "Manuell",
    status: sanitizeLeadStatus(asString(formData, "status")),
    value: asNumber(formData, "value"),
    nextStep: asString(formData, "nextStep"),
    notes: asString(formData, "notes"),
    owner,
    createdAt: today(),
  };

  if (!lead.name || !lead.company) {
    throw new Error("Lead requires name and company.");
  }

  await updateCrmData((current) => ({
    ...current,
    leads: [lead, ...current.leads],
    activities: [
      {
        id: crypto.randomUUID(),
        title: `Följ upp lead: ${lead.company}`,
        type: "Uppgift",
        status: "Planerad",
        dueDate: today(),
        owner: lead.owner,
        relatedType: "lead",
        relatedId: lead.id,
        notes: lead.nextStep || "Ny lead skapad i CRM.",
        createdAt: today(),
      },
      ...current.activities,
    ],
  }));

  revalidateCrm();
}

export async function advanceLeadStatus(formData: FormData) {
  await requireUser();
  const leadId = asString(formData, "leadId");

  await updateCrmData((current) => ({
    ...current,
    leads: current.leads.map((lead) =>
      lead.id === leadId
        ? {
            ...lead,
            status: getNextLeadStatus(lead.status),
          }
        : lead,
    ),
  }));

  revalidateCrm();
}

export async function convertLeadToCustomer(formData: FormData) {
  await requireUser();
  const leadId = asString(formData, "leadId");

  await updateCrmData((current) => {
    const lead = current.leads.find((item) => item.id === leadId);

    if (!lead) {
      return current;
    }

    const existingCustomer = current.customers.find(
      (item) => item.company.toLowerCase() === lead.company.toLowerCase(),
    );

    const customerId = existingCustomer?.id ?? crypto.randomUUID();

    const customer: Customer =
      existingCustomer ?? {
        id: customerId,
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        segment: "Ny kund",
        status: "Ska boka nytt möte",
        statusNotes: "Konverterad från lead och redo för första kunduppföljning.",
        city: "",
        notes: lead.notes,
        followUpDate: "",
        followUpAction: "",
        lastFollowUpCompletedAt: "",
        wonAt: "",
        wonValue: 0,
        owner: lead.owner,
        createdAt: today(),
      };

    const dealExists = current.deals.some((item) => item.sourceLeadId === lead.id);
    const deals: Deal[] = dealExists
      ? current.deals
      : [
          {
            id: crypto.randomUUID(),
            name: `${lead.company} onboarding`,
            company: lead.company,
            stage: "Prospekt",
            value: lead.value,
            owner: lead.owner,
            expectedCloseDate: today(),
            sourceLeadId: lead.id,
            customerId,
            createdAt: today(),
            updatedAt: today(),
          },
          ...current.deals,
        ];

    return {
      ...current,
      leads: current.leads.map((item) =>
        item.id === lead.id ? { ...item, status: "Vunnen" } : item,
      ),
      customers: existingCustomer
        ? current.customers
        : [customer, ...current.customers],
      deals,
    };
  });

  revalidateCrm();
}

export async function createCustomer(formData: FormData) {
  const userId = await requireUser();
  const owner = await sanitizeOwnerSelection(asString(formData, "owner"), userId);

  const customer: Customer = {
    id: crypto.randomUUID(),
    name: asString(formData, "name"),
    company: asString(formData, "company"),
    email: asString(formData, "email"),
    phone: asString(formData, "phone"),
    segment: asString(formData, "segment") || "Tillväxt",
    status: sanitizeCustomerStatus(asString(formData, "status")),
    statusNotes: asString(formData, "statusNotes"),
    city: asString(formData, "city"),
    notes: asString(formData, "notes"),
    followUpDate: asString(formData, "followUpDate"),
    followUpAction: asString(formData, "followUpAction"),
    lastFollowUpCompletedAt: "",
    wonAt: "",
    wonValue: 0,
    owner,
    createdAt: today(),
  };

  if (!customer.name || !customer.company) {
    throw new Error("Customer requires name and company.");
  }

  await updateCrmData((current) => ({
    ...current,
    customers: [customer, ...current.customers],
    activities:
      customer.followUpDate || customer.followUpAction
        ? [
            {
              id: crypto.randomUUID(),
              title: `Följ upp kund: ${customer.company}`,
              type: "Uppgift",
              status: "Planerad",
              dueDate: customer.followUpDate || today(),
              owner: customer.owner,
              relatedType: "customer",
              relatedId: customer.id,
              notes:
                customer.followUpAction ||
                customer.statusNotes ||
                "Planerad kunduppföljning från kundkortet.",
              createdAt: today(),
            },
            ...current.activities,
          ]
        : current.activities,
  }));

  revalidateCrm();
}

export async function updateCustomer(formData: FormData) {
  const userId = await requireUser();
  const customerId = asString(formData, "customerId");
  const owner = await sanitizeOwnerSelection(asString(formData, "owner"), userId);
  const markFollowUpComplete = formData.get("markFollowUpComplete") === "on";
  const markWon = formData.get("markWon") === "on";
  const wonValue = asNumber(formData, "wonValue");

  if (!customerId) {
    throw new Error("Kund saknas.");
  }

  await updateCrmData((current) => {
    const existingCustomer = current.customers.find((item) => item.id === customerId);

    if (!existingCustomer) {
      return current;
    }

    const submittedFollowUpDate = asString(formData, "followUpDate");
    const submittedFollowUpAction = asString(formData, "followUpAction");
    const keepSameFollowUp =
      markFollowUpComplete &&
      submittedFollowUpDate === existingCustomer.followUpDate &&
      submittedFollowUpAction === existingCustomer.followUpAction;
    const nextFollowUpDate = keepSameFollowUp ? "" : submittedFollowUpDate;
    const nextFollowUpAction = keepSameFollowUp ? "" : submittedFollowUpAction;
    const nextStatus = markWon
      ? "Betalande kund"
      : sanitizeCustomerStatus(asString(formData, "status"));

    const updatedCustomer: Customer = {
      ...existingCustomer,
      name: asString(formData, "name") || existingCustomer.name,
      company: asString(formData, "company") || existingCustomer.company,
      email: asString(formData, "email"),
      phone: asString(formData, "phone"),
      segment: asString(formData, "segment") || existingCustomer.segment,
      status: nextStatus,
      statusNotes: asString(formData, "statusNotes"),
      city: asString(formData, "city"),
      notes: asString(formData, "notes"),
      followUpDate: nextFollowUpDate,
      followUpAction: nextFollowUpAction,
      lastFollowUpCompletedAt: markFollowUpComplete
        ? today()
        : existingCustomer.lastFollowUpCompletedAt,
      wonAt: markWon ? today() : existingCustomer.wonAt,
      wonValue: markWon ? wonValue : existingCustomer.wonValue,
      owner,
    };

    const completedActivityId = markFollowUpComplete
      ? current.activities.find((activity) =>
          activity.relatedType === "customer" &&
          activity.relatedId === customerId &&
          activity.status === "Planerad",
        )?.id
      : null;

    const activities = current.activities
      .map((activity) =>
        activity.id === completedActivityId
          ? { ...activity, status: "Klar" as const }
          : activity,
      );

    const shouldCreateNextFollowUp =
      Boolean(nextFollowUpDate || nextFollowUpAction) &&
      (
        markFollowUpComplete ||
        nextFollowUpDate !== existingCustomer.followUpDate ||
        nextFollowUpAction !== existingCustomer.followUpAction
      );

    if (shouldCreateNextFollowUp) {
      activities.unshift({
        id: crypto.randomUUID(),
        title: `Följ upp kund: ${updatedCustomer.company}`,
        type: "Uppgift",
        status: "Planerad",
        dueDate: nextFollowUpDate || today(),
        owner: updatedCustomer.owner,
        relatedType: "customer",
        relatedId: updatedCustomer.id,
        notes:
          nextFollowUpAction ||
          updatedCustomer.statusNotes ||
          "Planerad kunduppföljning från kundkortet.",
        createdAt: today(),
      });
    }

    let deals = current.deals;

    if (markWon && wonValue > 0) {
      const wonDealName = `${updatedCustomer.company} - Vunnen kund`;
      const existingWonDeal = current.deals.find(
        (deal) =>
          deal.customerId === updatedCustomer.id &&
          deal.name === wonDealName,
      );

      if (existingWonDeal) {
        deals = current.deals.map((deal) =>
          deal.id === existingWonDeal.id
            ? {
                ...deal,
                stage: "Vunnen",
                value: wonValue,
                owner: updatedCustomer.owner,
                expectedCloseDate: today(),
                updatedAt: today(),
              }
            : deal,
        );
      } else {
        deals = [
          {
            id: crypto.randomUUID(),
            name: wonDealName,
            company: updatedCustomer.company,
            stage: "Vunnen",
            value: wonValue,
            owner: updatedCustomer.owner,
            expectedCloseDate: today(),
            sourceLeadId: null,
            customerId: updatedCustomer.id,
            createdAt: today(),
            updatedAt: today(),
          },
          ...current.deals,
        ];
      }
    }

    return {
      ...current,
      customers: current.customers.map((item) =>
        item.id === updatedCustomer.id ? updatedCustomer : item,
      ),
      activities,
      deals,
    };
  });

  revalidateCrm();
  revalidateCustomerPath(customerId);
}

export async function createDeal(formData: FormData) {
  const userId = await requireUser();
  const owner = await sanitizeOwnerSelection(asString(formData, "owner"), userId);

  const deal: Deal = {
    id: crypto.randomUUID(),
    name: asString(formData, "name"),
    company: asString(formData, "company"),
    stage: sanitizeDealStage(asString(formData, "stage")),
    value: asNumber(formData, "value"),
    owner,
    expectedCloseDate: asString(formData, "expectedCloseDate") || today(),
    sourceLeadId: asString(formData, "sourceLeadId") || null,
    customerId: asString(formData, "customerId") || null,
    createdAt: today(),
    updatedAt: today(),
  };

  if (!deal.name || !deal.company) {
    throw new Error("Deal requires name and company.");
  }

  await updateCrmData((current) => ({
    ...current,
    deals: [deal, ...current.deals],
  }));

  revalidateCrm();
}

export async function advanceDealStage(formData: FormData) {
  await requireUser();
  const dealId = asString(formData, "dealId");

  await updateCrmData((current) => ({
    ...current,
    deals: current.deals.map((deal) =>
      deal.id === dealId
        ? {
            ...deal,
            stage: getNextDealStage(deal.stage),
            updatedAt: today(),
          }
        : deal,
    ),
  }));

  revalidateCrm();
}

export async function createActivity(formData: FormData) {
  const userId = await requireUser();
  const owner = await sanitizeOwnerSelection(asString(formData, "owner"), userId);

  const activity: Activity = {
    id: crypto.randomUUID(),
    title: asString(formData, "title"),
    type: sanitizeActivityType(asString(formData, "type")),
    status: "Planerad",
    dueDate: asString(formData, "dueDate") || today(),
    owner,
    relatedType:
      (asString(formData, "relatedType") as Activity["relatedType"]) || "general",
    relatedId: asString(formData, "relatedId"),
    notes: asString(formData, "notes"),
    createdAt: today(),
  };

  if (!activity.title) {
    throw new Error("Activity requires title.");
  }

  await updateCrmData((current) => ({
    ...current,
    activities: [activity, ...current.activities],
  }));

  revalidateCrm();
}

export async function toggleActivityStatus(formData: FormData) {
  await requireUser();
  const activityId = asString(formData, "activityId");

  await updateCrmData((current) => ({
    ...current,
    activities: current.activities.map((activity) =>
      activity.id === activityId
        ? {
            ...activity,
            status: activity.status === "Planerad" ? "Klar" : "Planerad",
          }
        : activity,
    ),
  }));

  revalidateCrm();
}

export async function updateProfile(formData: FormData) {
  const userId = await requireUser();

  await updateCrmData((current) => {
    const existing = current.profiles.find((item) => item.userId === userId);
    const profile = {
      ...(existing ?? getDefaultProfile(userId)),
      userId,
      fullName: asString(formData, "fullName"),
      role: existing?.role ?? CRM_ROLE_NONE,
      focusArea: asString(formData, "focusArea"),
      bio: asString(formData, "bio"),
      updatedAt: new Date().toISOString(),
    };

    return {
      ...current,
      profiles: existing
        ? current.profiles.map((item) => (item.userId === userId ? profile : item))
        : [profile, ...current.profiles],
    };
  });

  revalidateCrm();
}

export async function updateUserRole(formData: FormData) {
  await requireCrmAdmin();
  const userId = asString(formData, "userId");
  const fullName = asString(formData, "fullName");
  const role = sanitizeCrmRole(asString(formData, "role"));

  if (!userId) {
    throw new Error("Användare saknas.");
  }

  const directory = await getCrmUserDirectory();
  const targetUser = directory.find((user) => user.userId === userId);

  if (!targetUser) {
    throw new Error("Kunde inte hitta användaren i Clerk.");
  }

  await updateCrmData((current) => {
    const existing = current.profiles.find((item) => item.userId === userId);
    const profile = {
      ...(existing ?? getDefaultProfile(userId)),
      userId,
      fullName: fullName || targetUser.fullName || targetUser.email,
      role,
      updatedAt: new Date().toISOString(),
    };

    return {
      ...current,
      profiles: existing
        ? current.profiles.map((item) => (item.userId === userId ? profile : item))
        : [profile, ...current.profiles],
    };
  });

  revalidateCrm();
}

export async function syncGoogleCalendar() {
  const userId = await requireUser();
  const current = await readCrmData();
  const result = await syncGoogleCalendarMeetingsForUser(userId, current);

  await updateCrmData(() => result.data);
  revalidateCrm();
}

export async function createCalendarMeeting(formData: FormData) {
  const userId = await requireUser();
  const summary = asString(formData, "summary");
  const startAt = parseMeetingDate(formData, "startDate", "startTime");
  const endAt = parseMeetingDate(formData, "endDate", "endTime");
  const relation = parseMeetingRelation(formData);

  if (!summary || !startAt || !endAt) {
    throw new Error("Meeting requires title, start and end time.");
  }

  const description = asString(formData, "description");
  const location = asString(formData, "location");

  let meeting: CalendarMeeting;

  try {
    meeting = await createGoogleCalendarMeetingForUser(userId, {
      summary,
      description,
      location,
      startAt,
      endAt,
      customerId: relation.customerId,
      leadId: relation.leadId,
      dealId: relation.dealId,
    });
  } catch (error) {
    if (!isCalendarConnectionIssue(error)) {
      throw error;
    }

    meeting = buildLocalCalendarMeeting({
      userId,
      summary,
      description,
      location,
      startAt,
      endAt,
      customerId: relation.customerId,
      leadId: relation.leadId,
      dealId: relation.dealId,
    });
  }

  await updateCrmData((current) => ({
    ...current,
    calendarMeetings: [meeting, ...current.calendarMeetings],
    activities: [
      {
        id: crypto.randomUUID(),
        title: meeting.summary,
        type: "Möte",
        status: "Planerad",
        dueDate: meeting.startAt.slice(0, 10),
        owner: userId,
        relatedType: meeting.customerId
          ? "customer"
          : meeting.leadId
            ? "lead"
            : meeting.dealId
              ? "deal"
              : "general",
        relatedId: meeting.customerId ?? meeting.leadId ?? meeting.dealId ?? "",
        notes: meeting.description || "Skapat från kalendern i CRM.",
        createdAt: today(),
      },
      ...current.activities,
    ],
  }));

  revalidateCrm();
}

export async function updateCalendarMeeting(formData: FormData) {
  const userId = await requireUser();
  const meetingId = asString(formData, "meetingId");
  const summary = asString(formData, "summary");
  const startAt = parseMeetingDate(formData, "startDate", "startTime");
  const endAt = parseMeetingDate(formData, "endDate", "endTime");
  const relation = parseMeetingRelation(formData);

  if (!meetingId || !summary || !startAt || !endAt) {
    throw new Error("Meeting requires id, title, start and end time.");
  }

  const current = await readCrmData();
  const existing = current.calendarMeetings.find((item) => item.id === meetingId);

  if (!existing) {
    throw new Error("Meeting not found.");
  }

  const description = asString(formData, "description");
  const location = asString(formData, "location");

  let updatedMeeting: CalendarMeeting;

  try {
    updatedMeeting = existing.googleEventId.startsWith("local:")
      ? await createGoogleCalendarMeetingForUser(userId, {
          summary,
          description,
          location,
          startAt,
          endAt,
          customerId: relation.customerId,
          leadId: relation.leadId,
          dealId: relation.dealId,
        })
      : await updateGoogleCalendarMeetingForUser(
          userId,
          existing.googleEventId,
          {
            summary,
            description,
            location,
            startAt,
            endAt,
            customerId: relation.customerId,
            leadId: relation.leadId,
            dealId: relation.dealId,
          },
          existing,
        );
  } catch (error) {
    if (!isCalendarConnectionIssue(error)) {
      throw error;
    }

    updatedMeeting = buildLocalCalendarMeeting({
      userId,
      summary,
      description,
      location,
      startAt,
      endAt,
      customerId: relation.customerId,
      leadId: relation.leadId,
      dealId: relation.dealId,
      existing,
    });
  }

  await updateCrmData((state) => ({
    ...state,
    calendarMeetings: state.calendarMeetings.map((item) =>
      item.id === meetingId ? updatedMeeting : item,
    ),
  }));

  revalidateCrm();
}
