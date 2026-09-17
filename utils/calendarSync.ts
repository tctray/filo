// utils/calendarSync.ts
// Syncs Filo application dates to the device native calendar.
// Uses expo-calendar — install with: npx expo install expo-calendar

import * as Calendar from "expo-calendar";
import { Alert, Platform } from "react-native";

// ─── Event type config ────────────────────────────────────────────────────────
const EVENT_CONFIG = {
  interview: { prefix: "🎤 Interview", alarmMinutes: 60 },
  followUp: { prefix: "📬 Follow-up", alarmMinutes: 1440 }, // 1 day before
  deadline: { prefix: "⏰ Deadline", alarmMinutes: 1440 },
};

// ─── Permission request ───────────────────────────────────────────────────────
export async function requestCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Calendar Access",
      "Filo needs calendar access to sync your interviews and deadlines. You can enable this in Settings.",
      [{ text: "OK" }],
    );
    return false;
  }
  if (Platform.OS === "ios") {
    await Calendar.requestRemindersPermissionsAsync();
  }
  return true;
}

// ─── Find best writable calendar (never creates one) ─────────────────────────
async function getWritableCalendar(): Promise<string> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") throw new Error("Calendar permission not granted");

  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );

  // Prefer a calendar already named "Filo" if the user made one
  const filoCalendar = calendars.find(
    (c) => c.title === "Filo" && c.allowsModifications,
  );
  if (filoCalendar) return filoCalendar.id;

  // Prefer a local/on-device writable calendar
  const localCal = calendars.find(
    (c) => c.allowsModifications && c.source?.isLocalAccount,
  );
  if (localCal) return localCal.id;

  // Fall back to any writable calendar
  const anyCal = calendars.find((c) => c.allowsModifications);
  if (anyCal) return anyCal.id;

  throw new Error("No writable calendar found on this device");
}

// ─── YMD string → JS Date ────────────────────────────────────────────────────
function ymdToDate(ymd: string, hour = 9): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 0, 0);
}

// ─── Build readable event title ───────────────────────────────────────────────
function buildTitle(
  type: keyof typeof EVENT_CONFIG,
  company: string,
  roleTitle: string,
): string {
  return `${EVENT_CONFIG[type].prefix}: ${company} — ${roleTitle}`;
}

// ─── Sync one application's dates to the native calendar ─────────────────────
// Returns updated map of { eventType: nativeEventId } to persist.
export async function syncApplicationToCalendar(
  app: {
    id: string;
    company: string;
    roleTitle: string;
    interviewDate?: string;
    followUpDate?: string;
    deadline?: string;
  },
  existingEventIds: Record<string, string> = {},
): Promise<Record<string, string>> {
  const hasPermission = await requestCalendarPermission();
  if (!hasPermission) return existingEventIds;

  let calendarId: string;
  try {
    calendarId = await getWritableCalendar();
  } catch (e) {
    console.warn("[CalendarSync] Could not find writable calendar:", e);
    return existingEventIds;
  }

  const updatedIds: Record<string, string> = { ...existingEventIds };

  const datesToSync: Array<{
    type: keyof typeof EVENT_CONFIG;
    date: string | undefined;
  }> = [
    { type: "interview", date: app.interviewDate },
    { type: "followUp", date: app.followUpDate },
    { type: "deadline", date: app.deadline },
  ];

  for (const { type, date } of datesToSync) {
    const config = EVENT_CONFIG[type];
    const existingId = existingEventIds[type];

    // Date cleared — delete the event
    if (!date) {
      if (existingId) {
        try {
          await Calendar.deleteEventAsync(existingId);
        } catch (_) {}
        delete updatedIds[type];
      }
      continue;
    }

    const startDate = ymdToDate(date, 9);
    const endDate = ymdToDate(date, 10);

    const eventDetails = {
      title: buildTitle(type, app.company, app.roleTitle),
      startDate,
      endDate,
      calendarId,
      notes: `Filo: ${app.company} — ${app.roleTitle}`,
      alarms: [{ relativeOffset: -config.alarmMinutes }],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      allDay: false,
    };

    try {
      if (existingId) {
        await Calendar.updateEventAsync(existingId, eventDetails);
        updatedIds[type] = existingId;
      } else {
        const newId = await Calendar.createEventAsync(calendarId, eventDetails);
        updatedIds[type] = newId;
      }
    } catch (e) {
      console.error(`[CalendarSync] Failed to sync ${type} event:`, e);
    }
  }

  return updatedIds;
}

// ─── Delete all calendar events for an application ───────────────────────────
export async function deleteApplicationCalendarEvents(
  eventIds: Record<string, string>,
): Promise<void> {
  for (const id of Object.values(eventIds)) {
    try {
      await Calendar.deleteEventAsync(id);
    } catch (_) {}
  }
}

// ─── Import events from the native calendar not yet tracked by Filo ──────────
export async function importEventsFromCalendar(
  knownEventIds: Set<string>,
): Promise<
  Array<{
    title: string;
    startDate: Date;
    nativeId: string;
    type: "interview" | "followUp" | "deadline" | "unknown";
  }>
> {
  const hasPermission = await requestCalendarPermission();
  if (!hasPermission) return [];

  let calendarId: string;
  try {
    calendarId = await getWritableCalendar();
  } catch (e) {
    return [];
  }

  const now = new Date();
  const sixMonthsOut = new Date(
    now.getFullYear(),
    now.getMonth() + 6,
    now.getDate(),
  );

  try {
    const events = await Calendar.getEventsAsync(
      [calendarId],
      now,
      sixMonthsOut,
    );

    return events
      .filter((e) => !knownEventIds.has(e.id))
      .map((e) => {
        let type: "interview" | "followUp" | "deadline" | "unknown" = "unknown";
        if (e.title?.includes("Interview")) type = "interview";
        else if (e.title?.includes("Follow-up")) type = "followUp";
        else if (e.title?.includes("Deadline")) type = "deadline";
        return {
          title: e.title ?? "Untitled",
          startDate: new Date(e.startDate),
          nativeId: e.id,
          type,
        };
      });
  } catch (e) {
    console.error("[CalendarSync] Failed to import events:", e);
    return [];
  }
}
