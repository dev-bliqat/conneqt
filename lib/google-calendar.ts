import { clerkClient } from "@clerk/nextjs/server";
import type { CalendarMeeting, CrmData } from "@/lib/crm-types";
import {
  GOOGLE_CALENDAR_SCOPE,
  type CalendarViewState,
  type GoogleCalendarEvent,
} from "@/lib/google-calendar-shared";
const GOOGLE_CALENDAR_FULL_SCOPE =
  "https://www.googleapis.com/auth/calendar";
const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_SYNC_LOOKBACK_DAYS = 30;
const GOOGLE_SYNC_LOOKAHEAD_DAYS = 180;

type CalendarEventInput = {
  summary: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  customerId: string | null;
  leadId: string | null;
  dealId: string | null;
};

type CalendarTokenIntent = "read" | "write";

function hasGoogleCalendarReadScope(scopes?: string[]) {
  return Boolean(
    scopes?.some((scope) =>
      [
        GOOGLE_CALENDAR_SCOPE,
        GOOGLE_CALENDAR_FULL_SCOPE,
        GOOGLE_CALENDAR_READONLY_SCOPE,
      ].includes(scope),
    ),
  );
}

function hasGoogleCalendarWriteScope(scopes?: string[]) {
  return Boolean(
    scopes?.some((scope) =>
      [GOOGLE_CALENDAR_SCOPE, GOOGLE_CALENDAR_FULL_SCOPE].includes(scope),
    ),
  );
}

async function getGoogleCalendarAccessTokenForUser(
  userId: string,
  intent: CalendarTokenIntent,
) {
  const client = await clerkClient();
  let tokenResponse:
    | Awaited<ReturnType<typeof client.users.getUserOauthAccessToken>>
    | null = null;

  try {
    tokenResponse = await client.users.getUserOauthAccessToken(userId, "google");
  } catch {
    tokenResponse = null;
  }

  const token = tokenResponse?.data[0];

  if (!token) {
    return {
      ok: false as const,
      state: {
        status: "needs_google" as const,
        events: [],
        message:
          "Ingen användbar Google-anslutning hittades i Clerk. Logga in med Google eller återanslut Google-kontot via profilmenyn för att ge kalenderåtkomst.",
      },
    };
  }

  const hasRequiredScope =
    intent === "write"
      ? hasGoogleCalendarWriteScope(token.scopes)
      : hasGoogleCalendarReadScope(token.scopes);

  if (!hasRequiredScope) {
    return {
      ok: false as const,
      state: {
        status: "needs_scope" as const,
        events: [],
        message:
          intent === "write"
            ? "Google-kontot är anslutet, men skrivbehörighet till kalendern saknas. Öppna profilmenyn och återanslut Google med kalenderåtkomst."
            : "Google-kontot är anslutet, men kalenderbehörighet saknas. Öppna profilmenyn och återanslut Google med kalenderåtkomst.",
      },
    };
  }

  return {
    ok: true as const,
    token: token.token,
  };
}

async function fetchGoogleCalendar<T>(
  userId: string,
  path: string,
  init: RequestInit,
  intent: CalendarTokenIntent,
) {
  const access = await getGoogleCalendarAccessTokenForUser(userId, intent);

  if (!access.ok) {
    return access;
  }

  const response = await fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access.token}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false as const,
      state: {
        status: "needs_scope" as const,
        events: [],
        message:
          intent === "write"
            ? "Kalendern kunde inte uppdateras med nuvarande Google-behörighet. Koppla om Google-kontot från profilen och godkänn kalenderåtkomst."
            : "Kalendern kunde inte läsas med nuvarande Google-behörighet. Koppla om Google-kontot från profilen och godkänn kalenderåtkomst.",
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false as const,
      state: {
        status: "error" as const,
        events: [],
        message:
          intent === "write"
            ? "Google Kalender kunde inte uppdateras just nu."
            : "Google Kalender kunde inte hämtas just nu.",
      },
    };
  }

  const data = (await response.json()) as T;

  return {
    ok: true as const,
    data,
  };
}

function getEventDateValue(value?: { date?: string; dateTime?: string }) {
  return value?.dateTime ?? value?.date ?? "";
}

function buildMeetingMetadata(input: CalendarEventInput) {
  const metadata: Record<string, string> = {};

  if (input.customerId) {
    metadata.crmCustomerId = input.customerId;
  }

  if (input.leadId) {
    metadata.crmLeadId = input.leadId;
  }

  if (input.dealId) {
    metadata.crmDealId = input.dealId;
  }

  return metadata;
}

function toCalendarMeeting(
  event: GoogleCalendarEvent,
  ownerUserId: string,
  existing?: CalendarMeeting,
): CalendarMeeting {
  const metadata = event.extendedProperties?.private ?? {};
  const now = new Date().toISOString();

  return {
    id: existing?.id ?? crypto.randomUUID(),
    googleEventId: event.id,
    provider: "google",
    ownerUserId,
    customerId: metadata.crmCustomerId ?? existing?.customerId ?? null,
    leadId: metadata.crmLeadId ?? existing?.leadId ?? null,
    dealId: metadata.crmDealId ?? existing?.dealId ?? null,
    summary: event.summary?.trim() || "Namnlöst möte",
    description: event.description ?? "",
    location: event.location ?? "",
    startAt: getEventDateValue(event.start),
    endAt: getEventDateValue(event.end),
    status: event.status ?? "confirmed",
    htmlLink: event.htmlLink ?? "",
    lastSyncedAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: event.updated ?? now,
  };
}

function mergeMeetingsIntoCrm(
  current: CrmData,
  userId: string,
  events: GoogleCalendarEvent[],
) {
  const existingMeetings = current.calendarMeetings ?? [];
  const existingByEventId = new Map(
    existingMeetings
      .filter((meeting) => meeting.ownerUserId === userId)
      .map((meeting) => [meeting.googleEventId, meeting]),
  );

  const mergedMeetings = events.map((event) =>
    toCalendarMeeting(event, userId, existingByEventId.get(event.id)),
  );
  const mergedEventIds = new Set(mergedMeetings.map((meeting) => meeting.googleEventId));
  const untouchedMeetings = existingMeetings.filter(
    (meeting) =>
      meeting.ownerUserId !== userId || !mergedEventIds.has(meeting.googleEventId),
  );

  return {
    ...current,
    calendarMeetings: [...mergedMeetings, ...untouchedMeetings],
  };
}

function getSyncWindow() {
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - GOOGLE_SYNC_LOOKBACK_DAYS);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + GOOGLE_SYNC_LOOKAHEAD_DAYS);

  return {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
  };
}

export async function getGoogleCalendarEventsForUser(
  userId: string,
): Promise<CalendarViewState> {
  const { timeMin, timeMax } = getSyncWindow();
  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  );
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "50");
  url.searchParams.set("showDeleted", "true");

  const response = await fetchGoogleCalendar<{ items?: GoogleCalendarEvent[] }>(
    userId,
    `${url.pathname}${url.search}`,
    { method: "GET" },
    "read",
  );

  if (!response.ok) {
    return response.state;
  }

  return {
    status: "ready",
    events: response.data.items ?? [],
  };
}

export async function syncGoogleCalendarMeetingsForUser(
  userId: string,
  current: CrmData,
) {
  const calendar = await getGoogleCalendarEventsForUser(userId);

  if (calendar.status !== "ready") {
    return {
      state: calendar,
      data: current,
    };
  }

  return {
    state: calendar,
    data: mergeMeetingsIntoCrm(current, userId, calendar.events),
  };
}

export async function createGoogleCalendarMeetingForUser(
  userId: string,
  input: CalendarEventInput,
) {
  const response = await fetchGoogleCalendar<GoogleCalendarEvent>(
    userId,
    "/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: {
          dateTime: new Date(input.startAt).toISOString(),
        },
        end: {
          dateTime: new Date(input.endAt).toISOString(),
        },
        extendedProperties: {
          private: buildMeetingMetadata(input),
        },
      }),
    },
    "write",
  );

  if (!response.ok) {
    throw new Error(response.state.message);
  }

  return toCalendarMeeting(response.data, userId);
}

export async function updateGoogleCalendarMeetingForUser(
  userId: string,
  googleEventId: string,
  input: CalendarEventInput,
  existing?: CalendarMeeting,
) {
  const response = await fetchGoogleCalendar<GoogleCalendarEvent>(
    userId,
    `/calendar/v3/calendars/primary/events/${googleEventId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: {
          dateTime: new Date(input.startAt).toISOString(),
        },
        end: {
          dateTime: new Date(input.endAt).toISOString(),
        },
        extendedProperties: {
          private: buildMeetingMetadata(input),
        },
      }),
    },
    "write",
  );

  if (!response.ok) {
    throw new Error(response.state.message);
  }

  return toCalendarMeeting(response.data, userId, existing);
}
