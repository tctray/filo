// utils/dates.ts
import { Job } from "@/types";

export function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayYMD(): string {
  return toYMD(new Date());
}

export function formatDisplayDate(ymd?: string): string {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toYMD(date);
}

export type CalendarEventType = "followUp" | "interview" | "deadline";

export type CalendarEvent = {
  jobId: string;
  company: string;
  roleTitle: string;
  status: Job["status"];
  eventType: CalendarEventType;
  date: string;
};

export type MarkedDates = Record<
  string,
  {
    dots: { key: string; color: string }[];
    selected?: boolean;
    selectedColor?: string;
  }
>;

const EVENT_COLORS: Record<CalendarEventType, string> = {
  followUp: "#60A5FA", // blue
  interview: "#A78BFA", // purple
  deadline: "#F87171", // red
};

export function buildMarkedDates(
  jobs: Job[],
  selectedDate?: string,
): MarkedDates {
  const marked: MarkedDates = {};

  for (const job of jobs) {
    const pairs: [string | undefined, CalendarEventType][] = [
      [job.followUpDate, "followUp"],
      [job.interviewDate, "interview"],
      [job.deadline, "deadline"],
    ];

    for (const [date, type] of pairs) {
      if (!date) continue;
      if (!marked[date]) marked[date] = { dots: [] };
      const already = marked[date].dots.find((d) => d.key === type);
      if (!already) {
        marked[date].dots.push({ key: type, color: EVENT_COLORS[type] });
      }
    }
  }

  if (selectedDate) {
    if (!marked[selectedDate]) marked[selectedDate] = { dots: [] };
    marked[selectedDate].selected = true;
    marked[selectedDate].selectedColor = "rgba(45,212,191,0.25)";
  }

  return marked;
}

export function getEventsForDate(jobs: Job[], date: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const job of jobs) {
    if (job.followUpDate === date) {
      events.push({
        jobId: job.id,
        company: job.company,
        roleTitle: job.roleTitle,
        status: job.status,
        eventType: "followUp",
        date,
      });
    }
    if (job.interviewDate === date) {
      events.push({
        jobId: job.id,
        company: job.company,
        roleTitle: job.roleTitle,
        status: job.status,
        eventType: "interview",
        date,
      });
    }
    if (job.deadline === date) {
      events.push({
        jobId: job.id,
        company: job.company,
        roleTitle: job.roleTitle,
        status: job.status,
        eventType: "deadline",
        date,
      });
    }
  }

  return events;
}

export function getUpcomingEvents(jobs: Job[], days = 7): CalendarEvent[] {
  const today = todayYMD();
  const end = addDays(today, days);
  const events: CalendarEvent[] = [];

  for (const job of jobs) {
    const pairs: [string | undefined, CalendarEventType][] = [
      [job.followUpDate, "followUp"],
      [job.interviewDate, "interview"],
      [job.deadline, "deadline"],
    ];
    for (const [date, type] of pairs) {
      if (date && date >= today && date <= end) {
        events.push({
          jobId: job.id,
          company: job.company,
          roleTitle: job.roleTitle,
          status: job.status,
          eventType: type,
          date,
        });
      }
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export const EVENT_COLOR = EVENT_COLORS;

export function eventTypeLabel(type: CalendarEventType): string {
  return {
    followUp: "Follow-up",
    interview: "Interview",
    deadline: "Deadline",
  }[type];
}
