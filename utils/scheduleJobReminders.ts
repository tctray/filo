// utils/scheduleJobReminders.ts
// Call this after addJob / updateJob to schedule all reminders for a job.
// Cancels any previous notifications stored on the job before scheduling new ones.

import { cancelScheduled, scheduleAtDate } from "./notifications";

export type JobReminderIds = {
  followUpId?: string;
  interviewId?: string;
  deadlineId?: string;
};

/**
 * Parse a date string (YYYY-MM-DD) + time string (09:00 AM / 14:30) into a Date.
 * Falls back to 09:00 if no time is given.
 */
function buildDate(dateStr: string, timeStr?: string): Date | null {
  if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return null;

  let hours = 9;
  let minutes = 0;

  if (timeStr && timeStr.trim()) {
    const clean = timeStr.trim().toUpperCase();

    // Try HH:MM AM/PM
    const ampm = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (ampm) {
      hours = parseInt(ampm[1], 10);
      minutes = parseInt(ampm[2], 10);
      if (ampm[3] === "PM" && hours !== 12) hours += 12;
      if (ampm[3] === "AM" && hours === 12) hours = 0;
    } else {
      // Try HH:MM (24hr)
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

/**
 * Schedule (or reschedule) all reminders for a job.
 * Pass previousIds to cancel stale notifications first.
 * Returns the new notification IDs to persist on the job object.
 */
export async function scheduleJobReminders(
  job: {
    company: string;
    roleTitle: string;
    followUpDate?: string;
    followUpTime?: string;
    interviewDate?: string;
    interviewTime?: string;
    deadline?: string;
    deadlineTime?: string;
  },
  previousIds: JobReminderIds = {},
): Promise<JobReminderIds> {
  const label = `${job.roleTitle} @ ${job.company}`;
  const ids: JobReminderIds = {};

  // Cancel previous notifications so we don't double-up
  if (previousIds.followUpId)
    await cancelScheduled(previousIds.followUpId).catch(() => {});
  if (previousIds.interviewId)
    await cancelScheduled(previousIds.interviewId).catch(() => {});
  if (previousIds.deadlineId)
    await cancelScheduled(previousIds.deadlineId).catch(() => {});

  // Follow-up
  if (job.followUpDate) {
    const date = buildDate(job.followUpDate, job.followUpTime);
    if (date && date.getTime() > Date.now() + 1000) {
      try {
        ids.followUpId = await scheduleAtDate({
          date,
          title: "📋 Follow-up Reminder",
          body: label,
          data: { type: "followUp" },
        });
      } catch (e) {
        console.warn("[scheduleJobReminders] follow-up:", e);
      }
    }
  }

  // Interview
  if (job.interviewDate) {
    const date = buildDate(job.interviewDate, job.interviewTime);
    if (date && date.getTime() > Date.now() + 1000) {
      try {
        ids.interviewId = await scheduleAtDate({
          date,
          title: "🎤 Interview Reminder",
          body: label,
          data: { type: "interview" },
        });
      } catch (e) {
        console.warn("[scheduleJobReminders] interview:", e);
      }
    }
  }

  // Deadline
  if (job.deadline) {
    const date = buildDate(job.deadline, job.deadlineTime);
    if (date && date.getTime() > Date.now() + 1000) {
      try {
        ids.deadlineId = await scheduleAtDate({
          date,
          title: "⏰ Deadline Reminder",
          body: label,
          data: { type: "deadline" },
        });
      } catch (e) {
        console.warn("[scheduleJobReminders] deadline:", e);
      }
    }
  }

  return ids;
}

/**
 * Cancel all reminders for a job (call on delete).
 */
export async function cancelJobReminders(ids: JobReminderIds) {
  if (ids.followUpId) await cancelScheduled(ids.followUpId).catch(() => {});
  if (ids.interviewId) await cancelScheduled(ids.interviewId).catch(() => {});
  if (ids.deadlineId) await cancelScheduled(ids.deadlineId).catch(() => {});
}
