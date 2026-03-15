import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "send due reminders",
  { minutes: 60 },
  internal.reminders.sendDueReminders
);

export default crons;
