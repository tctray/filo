// hooks/useCalendarSync.ts
// Drop this hook into any component that saves/deletes applications.
// It wraps syncApplicationToCalendar and persists the native event IDs
// per-application in AsyncStorage under "filo:cal_events:<appId>".

import {
    deleteApplicationCalendarEvents,
    importEventsFromCalendar,
    syncApplicationToCalendar,
} from "@/utils/calendarSync";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback } from "react";

const KEY = (appId: string) => `filo:cal_events:${appId}`;

export function useCalendarSync() {
  // ── Called every time an application is saved ────────────────────────────
  const syncOnSave = useCallback(
    async (app: {
      id: string;
      company: string;
      roleTitle: string;
      interviewDate?: string;
      followUpDate?: string;
      deadline?: string;
    }) => {
      try {
        const raw = await AsyncStorage.getItem(KEY(app.id));
        const existingIds: Record<string, string> = raw ? JSON.parse(raw) : {};

        const updatedIds = await syncApplicationToCalendar(app, existingIds);

        await AsyncStorage.setItem(KEY(app.id), JSON.stringify(updatedIds));
      } catch (e) {
        console.error("[useCalendarSync] syncOnSave failed:", e);
      }
    },
    [],
  );

  // ── Called when an application is deleted ───────────────────────────────
  const syncOnDelete = useCallback(async (appId: string) => {
    try {
      const raw = await AsyncStorage.getItem(KEY(appId));
      if (raw) {
        const eventIds: Record<string, string> = JSON.parse(raw);
        await deleteApplicationCalendarEvents(eventIds);
        await AsyncStorage.removeItem(KEY(appId));
      }
    } catch (e) {
      console.error("[useCalendarSync] syncOnDelete failed:", e);
    }
  }, []);

  // ── Pull new events from the native Filo calendar that Filo doesn't know about
  const importFromCalendar = useCallback(async (): Promise<
    ReturnType<typeof importEventsFromCalendar>
  > => {
    try {
      // Gather all native IDs already tracked
      const keys = await AsyncStorage.getAllKeys();
      const calKeys = keys.filter((k) => k.startsWith("filo:cal_events:"));
      const values = await AsyncStorage.multiGet(calKeys);

      const knownIds = new Set<string>();
      for (const [, val] of values) {
        if (val) {
          const ids: Record<string, string> = JSON.parse(val);
          Object.values(ids).forEach((id) => knownIds.add(id));
        }
      }

      return await importEventsFromCalendar(knownIds);
    } catch (e) {
      console.error("[useCalendarSync] importFromCalendar failed:", e);
      return [];
    }
  }, []);

  return { syncOnSave, syncOnDelete, importFromCalendar };
}
