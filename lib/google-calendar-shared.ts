export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

export type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  status?: string;
  htmlLink?: string;
  description?: string;
  location?: string;
  updated?: string;
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  extendedProperties?: {
    private?: Record<string, string>;
  };
};

export type CalendarViewState =
  | {
      status: "ready";
      events: GoogleCalendarEvent[];
    }
  | {
      status: "needs_google" | "needs_scope" | "error";
      events: GoogleCalendarEvent[];
      message: string;
    };

export function formatCalendarDateRange(event: {
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  startAt?: string;
  endAt?: string;
}) {
  const startValue = event.start?.dateTime ?? event.start?.date ?? event.startAt;
  const endValue = event.end?.dateTime ?? event.end?.date ?? event.endAt;

  if (!startValue) {
    return "Tid saknas";
  }

  const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);

  if (isAllDay) {
    return new Intl.DateTimeFormat("sv-SE", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(startValue));
  }

  const start = new Date(startValue);
  const end = endValue ? new Date(endValue) : null;
  const day = new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(start);
  const time = new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(start);

  if (!end) {
    return `${day} · ${time}`;
  }

  const endTime = new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(end);

  return `${day} · ${time}–${endTime}`;
}
