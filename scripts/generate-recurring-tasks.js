/**
 * Recurring task generator.
 *
 * Run manually with: npm run generate-recurring
 * In production, schedule this with a cron job (e.g. once per day):
 *   0 1 * * *  cd /path/to/taskflow && npm run generate-recurring
 *
 * How it works: a Task with isRecurringTemplate=true and a `recurrence`
 * object acts as a template. Each time this script runs, it checks
 * whether `recurrence.nextRunAt` has passed; if so, it creates a fresh
 * Task (status: todo) copying the template's title/assignees/priority,
 * then advances nextRunAt by the configured interval.
 */
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/taskflow";

function advanceDate(date, frequency, interval) {
  const next = new Date(date);
  if (frequency === "daily") next.setDate(next.getDate() + interval);
  if (frequency === "weekly") next.setDate(next.getDate() + interval * 7);
  if (frequency === "monthly") next.setMonth(next.getMonth() + interval);
  return next;
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const now = new Date();

  const templates = await db
    .collection("tasks")
    .find({
      isRecurringTemplate: true,
      "recurrence.frequency": { $exists: true },
    })
    .toArray();

  console.log(`Found ${templates.length} recurring template(s).`);
  let createdCount = 0;

  for (const template of templates) {
    const { recurrence } = template;
    const nextRunAt = recurrence.nextRunAt || template.createdAt;

    if (recurrence.endDate && new Date(recurrence.endDate) < now) {
      continue; // recurrence window has ended
    }

    if (new Date(nextRunAt) > now) {
      continue; // not due yet
    }

    // Spawn the next occurrence as a normal (non-template) task.
    await db.collection("tasks").insertOne({
      title: template.title,
      description: template.description,
      organizationId: template.organizationId,
      teamId: template.teamId,
      createdBy: template.createdBy,
      assigneeIds: template.assigneeIds,
      watcherIds: template.watcherIds || [],
      parentTaskId: undefined,
      isSubtask: false,
      status: "todo",
      priority: template.priority,
      visibility: template.visibility,
      dueDate: advanceDate(now, recurrence.frequency, recurrence.interval || 1),
      attachments: [],
      tags: template.tags || [],
      isRecurringTemplate: false,
      createdAt: now,
      updatedAt: now,
    });

    createdCount++;

    // Advance the template's own nextRunAt so it isn't re-triggered today.
    await db.collection("tasks").updateOne(
      { _id: template._id },
      {
        $set: {
          "recurrence.nextRunAt": advanceDate(now, recurrence.frequency, recurrence.interval || 1),
        },
      }
    );
  }

  console.log(`Created ${createdCount} new task instance(s) from recurring templates.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Recurring task generation failed:", err);
  process.exit(1);
});
