// utils/notifications.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// NOTE: setNotificationHandler is intentionally NOT called here at module level.
// It is called once in app/_layout.tsx on startup instead.

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }
    const req = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return (
      req.granted ||
      req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFFFFF",
    });
  } catch {}
}

export async function scheduleAtDate(opts: {
  date: Date;
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<string> {
  const { date, title, body, data } = opts;
  const target = date.getTime();
  if (Number.isNaN(target)) throw new Error("scheduleAtDate: invalid Date");
  if (target <= Date.now() + 1000)
    throw new Error("scheduleAtDate: date must be in the future");

  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

export async function scheduleMinutesBefore(opts: {
  eventDate: Date;
  minutesBefore: number;
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<string | null> {
  const { eventDate, minutesBefore, title, body, data } = opts;
  const reminderDate = new Date(eventDate.getTime() - minutesBefore * 60_000);
  if (reminderDate.getTime() <= Date.now() + 1000) return null;
  return scheduleAtDate({
    date: reminderDate,
    title,
    body,
    data: { ...data, minutesBefore },
  });
}

export async function cancelScheduled(id: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

export async function cancelAllScheduled() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

// Compatibility wrappers
export async function scheduleJobNotification(
  date: Date,
  title: string,
  body: string,
  data?: any,
) {
  return scheduleAtDate({ date, title, body, data });
}

export async function cancelJobNotification(id: string) {
  return cancelScheduled(id);
}

export async function cancelAllJobNotifications() {
  return cancelAllScheduled();
}
