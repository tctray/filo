// components/WebNotificationBanner.tsx
// Shows in-app toast banners on web when reminders are due.
// On native this component renders nothing — real push notifications handle it.

import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

// ── Types ──
type Banner = {
  id: string;
  title: string;
  body: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

// ── Check interval (ms) ──
const POLL_MS = 30_000; // check every 30 seconds
const SHOWN_KEY = "filo_shown_notifs_v1";

function getShown(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markShown(key: string) {
  try {
    const set = getShown();
    set.add(key);
    // Keep only last 200 entries to prevent unbounded growth
    const arr = Array.from(set).slice(-200);
    localStorage.setItem(SHOWN_KEY, JSON.stringify(arr));
  } catch {}
}

function parseDateTime(dateStr?: string, timeStr?: string): Date | null {
  if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return null;

  let hours = 9;
  let minutes = 0;

  if (timeStr && timeStr.trim()) {
    const clean = timeStr.trim().toUpperCase();
    const ampm = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (ampm) {
      hours = parseInt(ampm[1], 10);
      minutes = parseInt(ampm[2], 10);
      if (ampm[3] === "PM" && hours !== 12) hours += 12;
      if (ampm[3] === "AM" && hours === 12) hours = 0;
    } else {
      const hr24 = clean.match(/^(\d{1,2}):(\d{2})$/);
      if (hr24) {
        hours = parseInt(hr24[1], 10);
        minutes = parseInt(hr24[2], 10);
      }
    }
  }

  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

// ── Single toast ──
function Toast({
  banner,
  onDismiss,
}: {
  banner: Banner;
  onDismiss: (id: string) => void;
}) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();

    // Auto dismiss after 6 seconds
    const timer = setTimeout(() => dismiss(), 6000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => onDismiss(banner.id));
  }, [banner.id, onDismiss]);

  return (
    <Animated.View
      style={[styles.toast, { transform: [{ translateY }], opacity }]}
    >
      <View style={[styles.toastAccent, { backgroundColor: banner.color }]} />
      <View
        style={[styles.toastIcon, { backgroundColor: banner.color + "22" }]}
      >
        <Ionicons name={banner.icon} size={20} color={banner.color} />
      </View>
      <View style={styles.toastText}>
        <Text style={styles.toastTitle} numberOfLines={1}>
          {banner.title}
        </Text>
        <Text style={styles.toastBody} numberOfLines={2}>
          {banner.body}
        </Text>
      </View>
      <TouchableOpacity
        onPress={dismiss}
        style={styles.toastClose}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={16} color="#999" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main component ──
export default function WebNotificationBanner() {
  const { jobs } = useData();
  const { colors } = useTheme();
  const [banners, setBanners] = useState<Banner[]>([]);

  const checkReminders = useCallback(() => {
    const now = Date.now();
    const shown = getShown();
    const newBanners: Banner[] = [];

    for (const job of jobs) {
      const j = job as any;
      const label = `${job.roleTitle} @ ${job.company}`;

      const checks = [
        {
          key: `followUp-${job.id}-${j.followUpDate}`,
          date: parseDateTime(j.followUpDate, j.followUpTime),
          title: "📋 Follow-up Reminder",
          color: "#60A5FA",
          icon: "calendar-outline" as keyof typeof Ionicons.glyphMap,
        },
        {
          key: `interview-${job.id}-${j.interviewDate}`,
          date: parseDateTime(j.interviewDate, j.interviewTime),
          title: "🎤 Interview Reminder",
          color: "#A78BFA",
          icon: "mic-outline" as keyof typeof Ionicons.glyphMap,
        },
        {
          key: `deadline-${job.id}-${j.deadline}`,
          date: parseDateTime(j.deadline, j.deadlineTime),
          title: "⏰ Deadline Reminder",
          color: "#F59E0B",
          icon: "time-outline" as keyof typeof Ionicons.glyphMap,
        },
      ];

      for (const check of checks) {
        if (!check.date) continue;
        const diff = check.date.getTime() - now;
        // Fire if within the past 35 seconds (slightly more than poll interval)
        // or up to 5 minutes past due (in case tab was inactive)
        if (diff > -5 * 60_000 && diff <= 35_000 && !shown.has(check.key)) {
          markShown(check.key);
          newBanners.push({
            id: check.key + "-" + Date.now(),
            title: check.title,
            body: label,
            color: check.color,
            icon: check.icon,
          });
        }
      }
    }

    if (newBanners.length > 0) {
      setBanners((prev) => [...prev, ...newBanners]);
    }
  }, [jobs]);

  useEffect(() => {
    // Check immediately on mount
    checkReminders();
    const interval = setInterval(checkReminders, POLL_MS);
    return () => clearInterval(interval);
  }, [checkReminders]);

  const dismiss = useCallback((id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  if (banners.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {banners.map((b) => (
        <Toast key={b.id} banner={b} onDismiss={dismiss} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
    paddingTop: 12,
    gap: 8,
    pointerEvents: "box-none",
  } as any,
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    width: "90%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    overflow: "hidden",
    gap: 10,
    paddingRight: 12,
    paddingVertical: 12,
  },
  toastAccent: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
    marginLeft: 0,
  },
  toastIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  toastText: { flex: 1 },
  toastTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F5F5F5",
    marginBottom: 2,
  },
  toastBody: {
    fontSize: 12,
    color: "#999",
    lineHeight: 16,
  },
  toastClose: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
