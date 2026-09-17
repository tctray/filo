// app/(tabs)/calendar.tsx
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { Job } from "@/types";
import {
  buildMarkedDates,
  CalendarEvent,
  EVENT_COLOR,
  eventTypeLabel,
  formatDisplayDate,
  getEventsForDate,
  getUpcomingEvents,
  todayYMD,
} from "@/utils/dates";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";

const STATUS_LABELS: Record<Job["status"], string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

function EventCard({
  event,
  onPress,
}: {
  event: CalendarEvent;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const dotColor = EVENT_COLOR[event.eventType];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.eventCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.eventDot, { backgroundColor: dotColor }]} />
      <View style={styles.eventInfo}>
        <Text
          style={[styles.eventCompany, { color: colors.text }]}
          numberOfLines={1}
        >
          {event.company}
        </Text>
        <Text
          style={[styles.eventRole, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {event.roleTitle}
        </Text>
      </View>

      <View style={styles.eventRight}>
        <Text style={[styles.eventType, { color: dotColor }]}>
          {eventTypeLabel(event.eventType)}
        </Text>
        <Text style={[styles.eventStatus, { color: colors.textTertiary }]}>
          {STATUS_LABELS[event.status]}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { jobs } = useData();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<string>(todayYMD());

  const markedDates = buildMarkedDates(jobs as any[], selectedDate);
  const selectedEvents = getEventsForDate(jobs as any[], selectedDate);
  const upcomingEvents = getUpcomingEvents(jobs as any[], 7);

  const goToJob = (jobId: string) =>
    router.push({ pathname: "/job/[id]", params: { id: jobId } } as never);

  // ✅ Only Add button (FAB) calls this
  const addEvent = () => {
    if (Platform.OS === "web") {
      // Alert.alert doesn't work on web — use a direct navigation
      router.push({
        pathname: "/job/new",
        params: { prefillDate: selectedDate, eventType: "interview" },
      } as never);
      return;
    }
    Alert.alert("Add Event", "What kind of event?", [
      {
        text: "Follow-up",
        onPress: () =>
          router.push({
            pathname: "/job/new",
            params: { prefillDate: selectedDate, eventType: "followUp" },
          } as never),
      },
      {
        text: "Interview",
        onPress: () =>
          router.push({
            pathname: "/job/new",
            params: { prefillDate: selectedDate, eventType: "interview" },
          } as never),
      },
      {
        text: "Deadline",
        onPress: () =>
          router.push({
            pathname: "/job/new",
            params: { prefillDate: selectedDate, eventType: "deadline" },
          } as never),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header (no Add button here) */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Calendar</Text>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {(["followUp", "interview", "deadline"] as const).map((t) => (
            <View key={t} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: EVENT_COLOR[t] }]}
              />
              <Text
                style={[styles.legendText, { color: colors.textSecondary }]}
              >
                {eventTypeLabel(t)}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar */}
        <View
          style={[
            styles.calendarWrap,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Calendar
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={(day: { dateString: string }) =>
              setSelectedDate(day.dateString)
            }
            theme={{
              backgroundColor: "transparent",
              calendarBackground: "transparent",
              textSectionTitleColor: colors.textTertiary,
              selectedDayBackgroundColor: colors.accent,
              selectedDayTextColor: colors.accentText,
              todayTextColor: colors.accent,
              dayTextColor: colors.text,
              textDisabledColor: colors.textTertiary,
              dotColor: colors.accent,
              monthTextColor: colors.text,
              arrowColor: colors.accent,
              textDayFontWeight: "500",
              textMonthFontWeight: "700",
              textDayHeaderFontWeight: "600",
            }}
          />
        </View>

        {/* Selected date events */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {formatDisplayDate(selectedDate)}
          </Text>

          {selectedEvents.length === 0 ? (
            <Text style={[styles.noEvents, { color: colors.textTertiary }]}>
              No events on this day
            </Text>
          ) : (
            selectedEvents.map((e, i) => (
              <EventCard
                key={`${e.jobId}-${e.eventType}-${e.date}-${i}`}
                event={e}
                onPress={() => goToJob(e.jobId)}
              />
            ))
          )}
        </View>

        {/* Upcoming */}
        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              Next 7 Days
            </Text>

            {upcomingEvents.map((e, i) => (
              <View key={`${e.jobId}-${e.eventType}-${e.date}-${i}`}>
                <Text
                  style={[styles.upcomingDate, { color: colors.textTertiary }]}
                >
                  {formatDisplayDate(e.date)}
                </Text>
                <EventCard event={e} onPress={() => goToJob(e.jobId)} />
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ✅ ONLY Add button remaining */}
      <TouchableOpacity
        onPress={addEvent}
        activeOpacity={0.85}
        style={[styles.fab, { backgroundColor: colors.accent }]}
      >
        <Ionicons name="add" size={26} color={colors.accentText} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },

  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "800" },

  legend: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 12 },

  calendarWrap: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },

  section: { paddingHorizontal: 18, marginBottom: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  noEvents: { fontSize: 14, paddingVertical: 8 },

  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  eventDot: { width: 10, height: 10, borderRadius: 5 },
  eventInfo: { flex: 1 },
  eventCompany: { fontSize: 14, fontWeight: "600" },
  eventRole: { fontSize: 12, marginTop: 1 },
  eventRight: { alignItems: "flex-end" },
  eventType: { fontSize: 12, fontWeight: "600" },
  eventStatus: { fontSize: 11, marginTop: 2 },

  upcomingDate: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 4,
  },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
