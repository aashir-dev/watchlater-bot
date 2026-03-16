import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "send due reminders",
  { minutes: 1 },
  internal.reminders.sendDueReminders
);

export default crons;
