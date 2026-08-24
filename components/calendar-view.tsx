"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  createCalendarMeeting,
  syncGoogleCalendar,
  updateCalendarMeeting,
} from "@/app/actions";
import {
  Field,
  FormGrid,
  SubmitButton,
  Textarea,
} from "@/components/crm-ui";
import { type CalendarViewState } from "@/lib/google-calendar-shared";
import type { CalendarMeeting, CrmData } from "@/lib/crm-types";

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 23;
const HOUR_HEIGHT = 76;
const SIDE_GUTTER_WIDTH = 58;
const TIMEZONE_LABEL = "GMT-7";

type CalendarViewProps = {
  calendarState: CalendarViewState | null;
  meetings: CalendarMeeting[];
  data: CrmData;
};

type ViewMode = "week" | "fortnight" | "month";
type CalendarFamily = "work" | "meetings" | "personal" | "health" | "birthdays";

type MeetingModalProps = {
  mode: "create" | "edit";
  meeting?: CalendarMeeting;
  open: boolean;
  onClose: () => void;
  draftRange?: {
    startAt: string;
    endAt: string;
  } | null;
  relationOptions: Array<{
    label: string;
    customerId: string;
    leadId: string;
    dealId: string;
  }>;
};

type PositionedMeeting = {
  meeting: CalendarMeeting;
  left: string;
  width: string;
  top: number;
  height: number;
};

type AllDayItem = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  family: CalendarFamily;
  meta: string;
};

const familyStyles: Record<
  CalendarFamily,
  {
    label: string;
    dot: string;
    fill: string;
    accent: string;
    text: string;
    border: string;
  }
> = {
  work: {
    label: "Josef Händel",
    dot: "#1a73e8",
    fill: "#1a73e8",
    accent: "#1a73e8",
    text: "#ffffff",
    border: "#1a73e8",
  },
  meetings: {
    label: "Födelsedagar",
    dot: "#34a853",
    fill: "#34a853",
    accent: "#34a853",
    text: "#ffffff",
    border: "#34a853",
  },
  personal: {
    label: "Uppgifter",
    dot: "#4285f4",
    fill: "#4285f4",
    accent: "#4285f4",
    text: "#ffffff",
    border: "#4285f4",
  },
  health: {
    label: "Helgdagar i Sverige",
    dot: "#0b8043",
    fill: "#0b8043",
    accent: "#0b8043",
    text: "#ffffff",
    border: "#0b8043",
  },
  birthdays: {
    label: "Andra kalendrar",
    dot: "#5f6368",
    fill: "#f1f3f4",
    accent: "#5f6368",
    text: "#3c4043",
    border: "#dadce0",
  },
};

const staticAllDayItems: AllDayItem[] = [
  {
    id: "all-day-q3-planning",
    title: "Q3-planeringsvecka",
    startDate: "2026-08-12",
    endDate: "2026-08-14",
    family: "work",
    meta: "Planering",
  },
  {
    id: "all-day-ana-birthday",
    title: "Anas födelsedag",
    startDate: "2026-08-14",
    endDate: "2026-08-14",
    family: "birthdays",
    meta: "Hela dagen",
  },
];

function toDateInput(value?: string) {
  return value?.slice(0, 10) ?? "";
}

function toTimeInput(value?: string) {
  return value?.slice(11, 16) ?? "";
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth();
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatMonthLabel(date: Date) {
  const value = new Intl.DateTimeFormat("sv-SE", {
    month: "long",
    year: "numeric",
  }).format(date);
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function formatHeaderWeekday(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
  })
    .format(date)
    .toUpperCase();
}

function formatHeaderDay(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
  }).format(date);
}

function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatTimeLabel(dateValue: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateValue));
}

function toLocalDateTimeParts(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
    dateTime: `${year}-${month}-${day}T${hours}:${minutes}`,
  };
}

function getViewStart(viewMode: ViewMode, anchorDate: Date) {
  if (viewMode === "week") {
    return startOfWeek(anchorDate);
  }

  if (viewMode === "fortnight") {
    return startOfWeek(anchorDate);
  }

  return startOfMonth(anchorDate);
}

function getViewEnd(viewMode: ViewMode, anchorDate: Date) {
  if (viewMode === "week") {
    return endOfDay(addDays(startOfWeek(anchorDate), 6));
  }

  if (viewMode === "fortnight") {
    return endOfDay(addDays(startOfWeek(anchorDate), 13));
  }

  return endOfMonth(anchorDate);
}

function shiftAnchorDate(viewMode: ViewMode, anchorDate: Date, direction: -1 | 1) {
  if (viewMode === "week") {
    return addDays(anchorDate, direction * 7);
  }

  if (viewMode === "fortnight") {
    return addDays(anchorDate, direction * 14);
  }

  return addMonths(anchorDate, direction);
}

function formatPeriodLabel(viewMode: ViewMode, anchorDate: Date) {
  if (viewMode === "month") {
    return formatMonthLabel(anchorDate);
  }

  const start = getViewStart(viewMode, anchorDate);
  const end = viewMode === "week" ? addDays(start, 6) : addDays(start, 13);
  const startLabel = new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(end);

  return `${startLabel} – ${endLabel}`;
}

function hashValue(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function getMeetingFamily(meeting: CalendarMeeting): CalendarFamily {
  const key = `${meeting.summary}-${meeting.customerId ?? ""}-${meeting.location}`;
  const order: CalendarFamily[] = ["work", "meetings", "personal", "health"];
  return order[hashValue(key) % order.length];
}

function intervalsOverlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function getMinutesFromStart(dateValue: string) {
  const date = new Date(dateValue);
  return date.getHours() * 60 + date.getMinutes();
}

function clampMeetingRange(meeting: CalendarMeeting) {
  const startMinutes = getMinutesFromStart(meeting.startAt);
  const endMinutes = getMinutesFromStart(meeting.endAt);
  const min = DAY_START_HOUR * 60;
  const max = DAY_END_HOUR * 60;

  return {
    start: Math.max(min, Math.min(startMinutes, max)),
    end: Math.max(min + 20, Math.min(endMinutes, max)),
  };
}

function getPositionedMeetings(meetings: CalendarMeeting[]) {
  const sorted = [...meetings].sort((left, right) => left.startAt.localeCompare(right.startAt));
  const assignments = sorted.map((meeting) => {
    const range = clampMeetingRange(meeting);
    return {
      meeting,
      start: range.start,
      end: Math.max(range.end, range.start + 30),
      column: 0,
      columns: 1,
    };
  });

  const columnEnds: number[] = [];

  for (const item of assignments) {
    let assigned = false;

    for (let index = 0; index < columnEnds.length; index += 1) {
      if (columnEnds[index] <= item.start) {
        item.column = index;
        columnEnds[index] = item.end;
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      item.column = columnEnds.length;
      columnEnds.push(item.end);
    }
  }

  for (const item of assignments) {
    const overlapping = assignments.filter((candidate) =>
      intervalsOverlap(item.start, item.end, candidate.start, candidate.end),
    );
    item.columns = Math.max(
      1,
      ...overlapping.map((candidate) => candidate.column + 1),
    );
  }

  return assignments.map((item): PositionedMeeting => {
    const gutter = 6;
    const widthBase = 100 / item.columns;
    const widthAdjustment = ((item.columns - 1) * gutter) / item.columns;

    return {
      meeting: item.meeting,
      left: `calc(${widthBase * item.column}% + ${item.column * gutter}px)`,
      width: `calc(${widthBase}% - ${widthAdjustment}px)`,
      top: ((item.start - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT,
      height: Math.max(((item.end - item.start) / 60) * HOUR_HEIGHT, 30),
    };
  });
}

function getWeekDays(startDate: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(startDate, index);
    return {
      key: formatDateKey(date),
      date,
    };
  });
}

function getConsecutiveDays(startDate: Date, length: number) {
  return Array.from({ length }, (_, index) => {
    const date = addDays(startDate, index);
    return {
      key: formatDateKey(date),
      date,
    };
  });
}

function getMonthGrid(anchorDate: Date) {
  const monthStart = startOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      key: formatDateKey(date),
      date,
    };
  });
}

function filterMeetingsByRange(
  meetings: CalendarMeeting[],
  visibleFamilies: Record<Exclude<CalendarFamily, "birthdays">, boolean>,
  start: Date,
  end: Date,
) {
  return meetings.filter((meeting) => {
    const family = getMeetingFamily(meeting);

    if (family === "birthdays" || !visibleFamilies[family]) {
      return false;
    }

    const startDate = new Date(meeting.startAt);
    return startDate >= start && startDate <= end;
  });
}

function getAllDayItemsForRange(start: Date, end: Date) {
  return staticAllDayItems.filter((item) => {
    const itemStart = startOfDay(new Date(`${item.startDate}T00:00:00`));
    const itemEnd = endOfDay(new Date(`${item.endDate}T00:00:00`));
    return itemStart <= end && itemEnd >= start;
  });
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M13 13l4 4" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d={direction === "left" ? "M11.5 4.5L6 10l5.5 5.5" : "M8.5 4.5L14 10l-5.5 5.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
    </svg>
  );
}

function DayCardGrid({
  days,
  anchorDate,
  meetings,
  allDayItems,
  onEditMeeting,
  columnsClassName,
  dimOutsideMonth = false,
  currentTime,
}: {
  days: Array<{ key: string; date: Date }>;
  anchorDate: Date;
  meetings: CalendarMeeting[];
  allDayItems: AllDayItem[];
  onEditMeeting: (meeting: CalendarMeeting) => void;
  columnsClassName: string;
  dimOutsideMonth?: boolean;
  currentTime: Date;
}) {
  return (
    <div className={`grid gap-3 ${columnsClassName}`}>
      {days.map((day) => {
        const inMonth = isSameMonth(day.date, anchorDate);
        const isToday = isSameDay(day.date, currentTime);
        const dayMeetings = meetings.filter((meeting) =>
          isSameDay(new Date(meeting.startAt), day.date),
        );
        const dayItems = allDayItems.filter((item) => {
          const itemStart = startOfDay(new Date(`${item.startDate}T00:00:00`));
          const itemEnd = endOfDay(new Date(`${item.endDate}T00:00:00`));
          return day.date >= itemStart && day.date <= itemEnd;
        });

        return (
          <div
            key={day.key}
            className={`min-h-[220px] rounded-[1.15rem] border p-4 ${
              dimOutsideMonth && !inMonth
                ? "border-[#e3e6ea] bg-[#f8f9fa]"
                : "border-[#dadce0] bg-white"
            } ${isToday ? "ring-2 ring-[#1a73e8]/35" : ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#5f6368]">
                  {formatHeaderWeekday(day.date)}
                </p>
                <p className="mt-1 text-2xl font-normal text-[#202124]">
                  {formatHeaderDay(day.date)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {dayItems.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{
                      background: item.family === "birthdays" ? "#e6f4ea" : "#e8f0fe",
                      color: item.family === "birthdays" ? "#137333" : "#185abc",
                      border: `1px solid ${item.family === "birthdays" ? "#ceead6" : "#d2e3fc"}`,
                    }}
                  >
                    {item.title}
                  </div>
                );
              })}

              {dayMeetings.slice(0, 4).map((meeting) => {
                const family = getMeetingFamily(meeting);
                const style = familyStyles[family];

                return (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => onEditMeeting(meeting)}
                    className="w-full rounded-[0.85rem] border px-3 py-2 text-left"
                    style={{
                      background: style.fill,
                      color: style.text,
                      borderColor: style.border,
                    }}
                  >
                    <p className="truncate text-sm font-semibold">{meeting.summary}</p>
                    <p className="mt-1 text-[11px] text-current/80">
                      {formatTimeLabel(meeting.startAt)} - {formatTimeLabel(meeting.endAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MeetingModal({
  mode,
  meeting,
  open,
  onClose,
  draftRange,
  relationOptions,
}: MeetingModalProps) {
  const mounted = typeof document !== "undefined";

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const action = mode === "create" ? createCalendarMeeting : updateCalendarMeeting;

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(26,23,20,0.2)] backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-3">
        <div className="w-full max-w-3xl overflow-hidden rounded-[1.5rem] border border-[#dadce0] bg-white shadow-[0_16px_40px_rgba(60,64,67,0.18)]">
          <div className="flex items-start justify-between gap-4 border-b border-[#dadce0] px-5 py-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#5f6368]">
                {mode === "create" ? "Nytt möte" : "Redigera möte"}
              </p>
              <h2 className="mt-1 text-[1.4rem] text-[#202124]">
                {mode === "create" ? "Skapa möte i Google Kalender" : "Uppdatera möte"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#dadce0] px-3 py-1.5 text-sm font-medium text-[#5f6368] transition hover:bg-[#f8f9fa]"
            >
              Stäng
            </button>
          </div>

          <div className="px-5 py-4">
            <form action={action}>
              {meeting ? <input type="hidden" name="meetingId" value={meeting.id} /> : null}
              <FormGrid columns="four">
                <div className="md:col-span-2">
                  <Field
                    label="Mötestitel"
                    name="summary"
                    placeholder="Avstämning med Aurora Studio"
                    defaultValue={meeting?.summary}
                  />
                </div>
                <div className="xl:col-span-2" />
                <Field
                  label="Startdatum"
                  name="startDate"
                  type="date"
                  defaultValue={toDateInput(meeting?.startAt) || toDateInput(draftRange?.startAt)}
                />
                <Field
                  label="Starttid"
                  name="startTime"
                  type="time"
                  defaultValue={toTimeInput(meeting?.startAt) || toTimeInput(draftRange?.startAt) || "09:00"}
                />
                <Field
                  label="Slutdatum"
                  name="endDate"
                  type="date"
                  defaultValue={
                    toDateInput(meeting?.endAt) ||
                    toDateInput(draftRange?.endAt) ||
                    toDateInput(meeting?.startAt) ||
                    toDateInput(draftRange?.startAt)
                  }
                />
                <Field
                  label="Sluttid"
                  name="endTime"
                  type="time"
                  defaultValue={toTimeInput(meeting?.endAt) || toTimeInput(draftRange?.endAt) || "10:00"}
                />
                <Field
                  label="Plats eller länk"
                  name="location"
                  placeholder="Google Meet eller kontoret"
                  defaultValue={meeting?.location}
                />
                <label className="block xl:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-[#1a1714]/75">
                    Koppla till CRM
                  </span>
                  <select
                    name="relation"
                    defaultValue={`${meeting?.customerId ?? ""}|${meeting?.leadId ?? ""}|${meeting?.dealId ?? ""}`}
                    className="w-full rounded-2xl border border-[#dadce0] bg-white px-4 py-3 text-sm text-[#202124] outline-none transition focus:border-[#1a73e8]"
                  >
                    <option value="||">Ingen koppling</option>
                    {relationOptions.map((option) => (
                      <option
                        key={`${option.customerId}-${option.leadId}-${option.dealId}-${option.label}`}
                        value={`${option.customerId}|${option.leadId}|${option.dealId}`}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="xl:col-span-4">
                  <Textarea
                    label="Beskrivning"
                    name="description"
                    placeholder="Agenda, nästa steg och vad som behöver förberedas."
                    defaultValue={meeting?.description}
                  />
                </div>
                <div className="xl:col-span-4 flex justify-end pt-1">
                  <SubmitButton>
                    {mode === "create" ? "Skapa möte" : "Spara ändringar"}
                  </SubmitButton>
                </div>
              </FormGrid>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function WeekPlanner({
  startDate,
  meetings,
  allDayItems,
  onEditMeeting,
  onCreateMeetingAtSlot,
  currentTime,
}: {
  startDate: Date;
  meetings: CalendarMeeting[];
  allDayItems: AllDayItem[];
  onEditMeeting: (meeting: CalendarMeeting) => void;
  onCreateMeetingAtSlot: (range: { startAt: string; endAt: string }) => void;
  currentTime: Date;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const days = useMemo(() => getWeekDays(startDate), [startDate]);

  useEffect(() => {
    if (scrollerRef.current) {
      const morningOffset = HOUR_HEIGHT * 7;
      const currentOffset = currentTime.getHours() * HOUR_HEIGHT - HOUR_HEIGHT;
      scrollerRef.current.scrollTop = Math.max(morningOffset, currentOffset);
    }
  }, [currentTime, startDate]);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#e8eaed] bg-white">
      <div className="grid" style={{ gridTemplateColumns: `${SIDE_GUTTER_WIDTH}px repeat(7, minmax(0, 1fr))` }}>
        <div className="border-b border-r border-[#e8eaed] px-3 py-3">
          <span className="inline-flex rounded-full border border-[#dadce0] bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#5f6368]">
            {TIMEZONE_LABEL}
          </span>
        </div>
        {days.map((day) => {
          const isToday = isSameDay(day.date, currentTime);

          return (
            <div
              key={day.key}
              className={`border-b border-r border-[#e8eaed] px-4 py-3 last:border-r-0 ${
                isToday ? "bg-[#e8f0fe]" : ""
              }`}
            >
              <p className={`text-[11px] font-medium uppercase tracking-[0.12em] ${isToday ? "text-[#1a73e8]" : "text-[#5f6368]"}`}>
                {formatHeaderWeekday(day.date)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border-2 px-3 text-[26px] font-normal ${
                    isToday
                      ? "border-[#1a73e8] bg-[#1a73e8] text-white"
                      : "border-transparent text-[#202124]"
                  }`}
                >
                  {formatHeaderDay(day.date)}
                </span>
              </div>
            </div>
          );
        })}

        <div className="border-r border-[#e8eaed] px-3 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#5f6368]">
          Hela dagen
        </div>
        {days.map((day) => {
          const items = allDayItems.filter((item) => {
            const itemStart = new Date(`${item.startDate}T00:00:00`);
            const itemEnd = new Date(`${item.endDate}T23:59:59`);
            return day.date >= startOfDay(itemStart) && day.date <= endOfDay(itemEnd);
          });

          return (
            <div key={`${day.key}-all-day`} className="min-h-[52px] border-r border-t border-[#e8eaed] px-2 py-2 last:border-r-0">
              <div className="space-y-2">
                {items.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className="rounded-full px-3 py-1.5 text-xs font-medium"
                      style={{
                        background: item.family === "birthdays" ? "#e6f4ea" : "#e8f0fe",
                        color: item.family === "birthdays" ? "#137333" : "#185abc",
                        border: `1px solid ${item.family === "birthdays" ? "#ceead6" : "#d2e3fc"}`,
                      }}
                    >
                      {item.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div ref={scrollerRef} className="max-h-[760px] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: `${SIDE_GUTTER_WIDTH}px repeat(7, minmax(0, 1fr))` }}>
          <div className="relative border-r border-[#e8eaed]">
            {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, index) => {
              const hour = DAY_START_HOUR + index;

              return (
                <div
                  key={hour}
                  className="relative border-b border-[#e8eaed]"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <span className="absolute -top-2 left-3 bg-white pr-1 text-[11px] tabular-nums text-[#5f6368]">
                    {formatHourLabel(hour)}
                  </span>
                </div>
              );
            })}
          </div>

          {days.map((day) => {
            const isToday = isSameDay(day.date, currentTime);
            const dayMeetings = meetings.filter((meeting) =>
              isSameDay(new Date(meeting.startAt), day.date),
            );
            const positionedMeetings = getPositionedMeetings(dayMeetings);
            const showCurrentLine = isToday;
            const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
            const currentLineTop = ((nowMinutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT;

            return (
              <div
                key={`${day.key}-grid`}
                onClick={(event) => {
                  const target = event.target as HTMLElement | null;

                  if (target?.closest("button")) {
                    return;
                  }

                  const rect = event.currentTarget.getBoundingClientRect();
                  const offsetY = event.clientY - rect.top;
                  const rawMinutes = DAY_START_HOUR * 60 + (offsetY / HOUR_HEIGHT) * 60;
                  const roundedMinutes = Math.max(
                    0,
                    Math.min(23 * 60 + 30, Math.round(rawMinutes / 30) * 30),
                  );
                  const startHour = Math.floor(roundedMinutes / 60);
                  const startMinute = roundedMinutes % 60;
                  const startAt = new Date(day.date);
                  startAt.setHours(startHour, startMinute, 0, 0);
                  const endAt = new Date(startAt);
                  endAt.setMinutes(endAt.getMinutes() + 60);

                  onCreateMeetingAtSlot({
                    startAt: toLocalDateTimeParts(startAt).dateTime,
                    endAt: toLocalDateTimeParts(endAt).dateTime,
                  });
                }}
                className={`relative border-r border-[#e8eaed] last:border-r-0 ${
                  isToday ? "bg-[#f8fbff]" : "bg-white"
                }`}
                style={{ height: `${(DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT}px` }}
              >
                {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, index) => (
                  <div
                    key={`${day.key}-hour-${index}`}
                    className="absolute left-0 right-0 border-b border-[#e8eaed]"
                    style={{ top: `${index * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                  >
                    <div className="absolute left-0 right-0 top-1/2 border-b border-dashed border-[#eef1f4]" />
                  </div>
                ))}

                {showCurrentLine ? (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20"
                    style={{ top: `${currentLineTop}px` }}
                  >
                    <div className="absolute -left-[5px] top-[-4px] h-[10px] w-[10px] rounded-full border-2 border-white bg-[#ea4335]" />
                    <div className="h-[2px] w-full bg-[#ea4335]" />
                  </div>
                ) : null}

                {positionedMeetings.map((item) => {
                  const family = getMeetingFamily(item.meeting);
                  const style = familyStyles[family];
                  const compact = item.height < 66;

                  return (
                    <button
                      key={item.meeting.id}
                      type="button"
                      onClick={() => onEditMeeting(item.meeting)}
                      className="absolute z-10 overflow-hidden rounded-[1rem] border px-3 py-2 text-left shadow-[0_8px_18px_rgba(26,23,20,0.06)]"
                      style={{
                        left: item.left,
                        width: item.width,
                        top: `${item.top + 4}px`,
                        height: `${item.height - 8}px`,
                        background: style.fill,
                        borderColor: style.border,
                        color: style.text,
                      }}
                    >
                      <span
                        className="absolute inset-y-0 left-0 w-[3px]"
                        style={{ background: style.accent }}
                      />
                      <div className="pl-2">
                        <p className="truncate text-[12.5px] font-semibold">{item.meeting.summary}</p>
                        <p className="mt-1 truncate text-[10.5px] text-current/78">
                          {compact
                            ? `${formatTimeLabel(item.meeting.startAt)}`
                            : `${formatTimeLabel(item.meeting.startAt)} - ${formatTimeLabel(item.meeting.endAt)} · ${item.meeting.location || "CRM-system"}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CalendarView({ calendarState, meetings, data }: CalendarViewProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<CalendarMeeting | null>(null);
  const [createDraftRange, setCreateDraftRange] = useState<{
    startAt: string;
    endAt: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [visibleFamilies, setVisibleFamilies] = useState({
    work: true,
    meetings: true,
    personal: true,
    health: true,
  });

  useEffect(() => {
    const syncNow = () => setCurrentTime(new Date());

    syncNow();
    const intervalId = window.setInterval(syncNow, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const relationOptions = useMemo(
    () => [
      ...data.customers.map((customer) => ({
        label: `Kund · ${customer.company} (${customer.name})`,
        customerId: customer.id,
        leadId: "",
        dealId: "",
      })),
      ...data.leads.map((lead) => ({
        label: `Lead · ${lead.company} (${lead.name})`,
        customerId: "",
        leadId: lead.id,
        dealId: "",
      })),
      ...data.deals.map((deal) => ({
        label: `Affär · ${deal.name}`,
        customerId: deal.customerId ?? "",
        leadId: deal.sourceLeadId ?? "",
        dealId: deal.id,
      })),
    ],
    [data.customers, data.deals, data.leads],
  );

  const rangeStart = getViewStart(viewMode, anchorDate);
  const rangeEnd = getViewEnd(viewMode, anchorDate);

  const filteredMeetings = useMemo(
    () => filterMeetingsByRange(meetings, visibleFamilies, rangeStart, rangeEnd),
    [meetings, rangeEnd, rangeStart, visibleFamilies],
  );

  const allDayItems = useMemo(() => getAllDayItemsForRange(rangeStart, rangeEnd), [rangeEnd, rangeStart]);

  const visibleWeeks = useMemo(() => {
    if (viewMode === "week") {
      return [startOfWeek(anchorDate)];
    }

    return [];
  }, [anchorDate, viewMode]);

  const monthGrid = useMemo(() => getMonthGrid(anchorDate), [anchorDate]);
  const fortnightDays = useMemo(
    () => getConsecutiveDays(getViewStart("fortnight", anchorDate), 14),
    [anchorDate],
  );

  const upNext = useMemo(
    () =>
      [...meetings]
        .filter((meeting) => new Date(meeting.startAt) >= currentTime)
        .sort((left, right) => left.startAt.localeCompare(right.startAt))
        .slice(0, 3),
    [currentTime, meetings],
  );

  const plannerSummary = useMemo(() => {
    const crmLinked = filteredMeetings.filter(
      (meeting) => meeting.customerId || meeting.leadId || meeting.dealId,
    ).length;

    return {
      total: filteredMeetings.length,
      linked: crmLinked,
      active: filteredMeetings.filter((meeting) => meeting.status === "confirmed").length,
    };
  }, [filteredMeetings]);

  function toggleFamily(family: Exclude<CalendarFamily, "birthdays">) {
    setVisibleFamilies((current) => ({
      ...current,
      [family]: !current[family],
    }));
  }

  function openCreateModal(range?: { startAt: string; endAt: string }) {
    setCreateDraftRange(range ?? null);
    setIsCreateOpen(true);
  }

  return (
    <>
      <section className="overflow-hidden rounded-[1.6rem] border border-[#dadce0] bg-[#f8f9fa] text-[#202124] shadow-[0_10px_28px_rgba(60,64,67,0.14)]">
        <div className="sticky top-0 z-30 border-b border-[#dadce0] bg-[rgba(248,249,250,0.96)] backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-4 px-5 py-4 lg:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-[22px] text-[#5f6368] transition hover:bg-white">☰</button>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4285f4] text-xl font-medium text-white">16</span>
              <div className="min-w-0">
                <h2 className="truncate text-[1.1rem] font-normal leading-none text-[#202124]">Kalender</h2>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:ml-4">
              <button
                type="button"
                onClick={() => setAnchorDate(startOfDay(currentTime))}
                className="rounded-full border border-[#c4c7c5] bg-white px-6 py-2.5 text-sm font-medium text-[#202124] transition hover:bg-[#f8f9fa]"
              >
                I dag
              </button>
              <button
                type="button"
                onClick={() => setAnchorDate(shiftAnchorDate(viewMode, anchorDate, -1))}
                className="rounded-full p-2 text-[#5f6368] transition hover:bg-white hover:text-[#202124]"
              >
                <ArrowIcon direction="left" />
              </button>
              <button
                type="button"
                onClick={() => setAnchorDate(shiftAnchorDate(viewMode, anchorDate, 1))}
                className="rounded-full p-2 text-[#5f6368] transition hover:bg-white hover:text-[#202124]"
              >
                <ArrowIcon direction="right" />
              </button>
              <div className="min-w-0">
                <h2 className="truncate text-[1.7rem] font-normal leading-none text-[#202124]">
                  {formatMonthLabel(anchorDate)}
                </h2>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-full border border-[#c4c7c5] bg-white p-1">
                {[
                  { id: "week", label: "Vecka" },
                  { id: "fortnight", label: "14 dagar" },
                  { id: "month", label: "Månad" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setViewMode(option.id as ViewMode);
                      setAnchorDate(startOfDay(currentTime));
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      viewMode === option.id
                        ? "bg-[#d2e3fc] text-[#174ea6]"
                        : "text-[#5f6368] hover:text-[#202124]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="rounded-full p-3 text-[#5f6368] transition hover:bg-white hover:text-[#202124]"
              >
                <SearchIcon />
              </button>

              <form action={syncGoogleCalendar}>
                <button
                  type="submit"
                  className="rounded-full border border-[#dadce0] bg-white px-4 py-3 text-sm font-medium text-[#202124] transition hover:bg-[#f8f9fa]"
                >
                  Synka
                </button>
              </form>

              <button
                type="button"
                onClick={() => openCreateModal()}
                className="inline-flex items-center gap-2 rounded-[1.2rem] border border-[#dadce0] bg-white px-5 py-3 text-sm font-medium text-[#202124] shadow-[0_1px_2px_rgba(60,64,67,0.24)] transition hover:bg-[#f8f9fa]"
              >
                <PlusIcon />
                Skapa
              </button>

              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d2e3fc] text-sm font-semibold text-[#174ea6]">
                JH
              </span>
            </div>
          </div>
        </div>

        <div className="grid min-h-[920px] lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="hidden border-r border-[#dadce0] bg-[#f8f9fa] lg:block">
            <div className="space-y-8 px-5 py-6">
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="inline-flex items-center gap-4 rounded-[1.45rem] border border-[#dadce0] bg-white px-8 py-5 text-[1rem] font-medium text-[#202124] shadow-[0_1px_3px_rgba(60,64,67,0.3)]"
              >
                <span className="text-[2rem] leading-none text-[#202124]">+</span>
                Skapa
              </button>

              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-[1.1rem] font-medium text-[#202124]">
                    {formatMonthLabel(anchorDate)}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAnchorDate(addMonths(anchorDate, -1))}
                      className="rounded-full p-2 text-[#5f6368] transition hover:bg-white hover:text-[#202124]"
                    >
                      <ArrowIcon direction="left" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnchorDate(addMonths(anchorDate, 1))}
                      className="rounded-full p-2 text-[#5f6368] transition hover:bg-white hover:text-[#202124]"
                    >
                      <ArrowIcon direction="right" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.1em] text-[#5f6368]">
                  {["M", "T", "O", "T", "F", "L", "S"].map((label, index) => (
                    <span key={`${label}-${index}`}>{label}</span>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-7 gap-1">
                  {monthGrid.map((day) => {
                    const inMonth = isSameMonth(day.date, anchorDate);
                    const isToday = isSameDay(day.date, currentTime);
                    const highlighted =
                      day.date >= rangeStart && day.date <= rangeEnd;

                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => setAnchorDate(startOfDay(day.date))}
                        className={`flex h-9 items-center justify-center rounded-full text-sm transition ${
                          isToday
                            ? "bg-[#1a73e8] text-white"
                            : highlighted
                              ? "bg-[#e8f0fe] text-[#174ea6]"
                              : inMonth
                                ? "text-[#202124]"
                                : "text-[#c1c7cd]"
                        }`}
                      >
                        {day.date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#5f6368]">
                  Mina kalendrar
                </p>
                <div className="mt-4 space-y-2">
                  {(["work", "meetings", "personal", "health"] as const).map((family) => {
                    const style = familyStyles[family];

                    return (
                      <button
                        key={family}
                        type="button"
                        onClick={() => toggleFamily(family)}
                        className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition hover:bg-white"
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ background: style.dot }}
                          />
                          <span className="text-sm text-[#202124]">{style.label}</span>
                        </span>
                        <span
                          className={`h-5 w-5 rounded-full border ${
                            visibleFamilies[family]
                              ? "border-[#1a73e8] bg-[#1a73e8]"
                              : "border-[#dadce0] bg-transparent"
                          }`}
                        />
                      </button>
                    );
                  })}
                  <div className="flex items-center justify-between rounded-2xl px-3 py-2 opacity-45">
                    <span className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full border border-[#bbaea2] bg-transparent" />
                      <span className="text-sm text-[#5f6368]">{familyStyles.birthdays.label}</span>
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#5f6368]">
                  Bokningssidor
                </p>
                <div className="mt-4 rounded-2xl bg-[#e8f0fe] px-4 py-4 text-[#3c4043]">
                  <p className="text-base">Sök efter personer</p>
                </div>
              </section>

              <section>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#5f6368]">
                  Kommande
                </p>
                <div className="mt-4 space-y-4">
                  {upNext.map((meeting) => {
                    const family = getMeetingFamily(meeting);

                    return (
                      <div key={meeting.id} className="grid grid-cols-[54px_minmax(0,1fr)] gap-3">
                        <div className="pt-1 text-right text-sm leading-5 text-[#5f6368]">
                          <p>{formatTimeLabel(meeting.startAt)}</p>
                          <p>{formatTimeLabel(meeting.endAt)}</p>
                        </div>
                        <div className="rounded-[1rem] border border-[#dadce0] bg-white px-3 py-3">
                          <div className="flex items-start gap-3">
                            <span
                              className="mt-0.5 h-10 w-[3px] rounded-full"
                              style={{ background: familyStyles[family].accent }}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#202124]">
                                {meeting.summary}
                              </p>
                              <p className="mt-1 text-sm text-[#5f6368]">
                                {meeting.location || "Google Kalender"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </aside>

          <main className="min-w-0 bg-[#f8f9fa]">
            <div className="border-b border-[#dadce0] px-5 py-5 lg:px-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#5f6368]">
                    Visar
                  </p>
                  <h3 className="mt-2 text-[2rem] font-normal text-[#202124]">
                    {formatPeriodLabel(viewMode, anchorDate)}
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1rem] border border-[#dadce0] bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#5f6368]">Möten</p>
                    <p className="mt-2 text-2xl font-semibold">{plannerSummary.total}</p>
                  </div>
                  <div className="rounded-[1rem] border border-[#dadce0] bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#5f6368]">Kopplade</p>
                    <p className="mt-2 text-2xl font-semibold">{plannerSummary.linked}</p>
                  </div>
                  <div className="rounded-[1rem] border border-[#dadce0] bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#5f6368]">Bekräftade</p>
                    <p className="mt-2 text-2xl font-semibold">{plannerSummary.active}</p>
                  </div>
                </div>
              </div>
            </div>

            {calendarState?.status !== "ready" ? (
              <div className="px-5 pt-5 lg:px-7">
                <div className="rounded-[1.35rem] border border-[#dadce0] bg-white px-5 py-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                      <p className="text-base font-medium text-[#202124]">
                        Google Kalender behöver anslutas fullt ut
                      </p>
                      <p className="mt-3 text-sm leading-6 text-[#5f6368]">
                        {calendarState?.message ??
                          "Ingen användarsession hittades för att visa kalendern."}
                      </p>
                    </div>
                    <Link
                      href="/user-profile"
                      className="inline-flex items-center rounded-full bg-[#1a73e8] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#185abc]"
                    >
                      Reconnecta Google
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="px-4 py-5 sm:hidden">
              {viewMode === "week" ? (
                <WeekPlanner
                  startDate={startOfWeek(anchorDate)}
                  meetings={filteredMeetings.filter((meeting) =>
                    isSameDay(new Date(meeting.startAt), currentTime),
                  )}
                  allDayItems={allDayItems}
                  onEditMeeting={setEditingMeeting}
                  onCreateMeetingAtSlot={openCreateModal}
                  currentTime={currentTime}
                />
              ) : viewMode === "fortnight" ? (
                <DayCardGrid
                  days={fortnightDays}
                  anchorDate={anchorDate}
                  meetings={filteredMeetings}
                  allDayItems={allDayItems}
                  onEditMeeting={setEditingMeeting}
                  columnsClassName="grid-cols-1"
                  currentTime={currentTime}
                />
              ) : (
                <DayCardGrid
                  days={monthGrid}
                  anchorDate={anchorDate}
                  meetings={filteredMeetings}
                  allDayItems={allDayItems}
                  onEditMeeting={setEditingMeeting}
                  columnsClassName="grid-cols-1"
                  dimOutsideMonth
                  currentTime={currentTime}
                />
              )}
            </div>

            <div className="hidden space-y-5 px-5 py-5 sm:block lg:px-7">
              {viewMode === "month" ? (
                <DayCardGrid
                  days={monthGrid}
                  anchorDate={anchorDate}
                  meetings={filteredMeetings}
                  allDayItems={allDayItems}
                  onEditMeeting={setEditingMeeting}
                  columnsClassName="md:grid-cols-2 xl:grid-cols-7"
                  dimOutsideMonth
                  currentTime={currentTime}
                />
              ) : viewMode === "fortnight" ? (
                <DayCardGrid
                  days={fortnightDays}
                  anchorDate={anchorDate}
                  meetings={filteredMeetings}
                  allDayItems={allDayItems}
                  onEditMeeting={setEditingMeeting}
                  columnsClassName="md:grid-cols-2 xl:grid-cols-7"
                  currentTime={currentTime}
                />
              ) : (
                visibleWeeks.map((weekStart) => (
                  <WeekPlanner
                    key={formatDateKey(weekStart)}
                    startDate={weekStart}
                    meetings={filteredMeetings.filter((meeting) => {
                      const date = new Date(meeting.startAt);
                      return date >= weekStart && date <= endOfDay(addDays(weekStart, 6));
                    })}
                    allDayItems={allDayItems}
                    onEditMeeting={setEditingMeeting}
                    onCreateMeetingAtSlot={openCreateModal}
                    currentTime={currentTime}
                  />
                ))
              )}
            </div>
          </main>
        </div>
      </section>

      <MeetingModal
        key={`create-${String(isCreateOpen)}`}
        mode="create"
        open={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateDraftRange(null);
        }}
        draftRange={createDraftRange}
        relationOptions={relationOptions}
      />

      <MeetingModal
        key={`edit-${editingMeeting?.id ?? "closed"}`}
        mode="edit"
        meeting={editingMeeting ?? undefined}
        open={Boolean(editingMeeting)}
        onClose={() => setEditingMeeting(null)}
        draftRange={null}
        relationOptions={relationOptions}
      />
    </>
  );
}
