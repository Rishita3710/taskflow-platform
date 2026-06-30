/**
 * Seed script: creates a demo organization with one user per role,
 * a handful of tasks in different statuses, and a sample discussion
 * thread, so you can log in and see a populated app immediately.
 *
 * Usage:
 *   npm run seed
 *
 * Demo logins (password for all: Password123!):
 *   admin@demo.taskflow.app     (super_admin)
 *   manager@demo.taskflow.app   (manager)
 *   lead@demo.taskflow.app      (team_lead)
 *   employee@demo.taskflow.app  (employee)
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/taskflow";
const DEMO_PASSWORD = "Password123!";

async function run() {
  console.log(`Connecting to ${MONGODB_URI} ...`);
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;

  console.log("Clearing existing demo data...");
  await db.collection("organizations").deleteMany({ slug: /^demo-taskflow/ });
  const existingOrg = await db.collection("organizations").findOne({ slug: /^demo-taskflow/ });
  if (existingOrg) {
    await db.collection("users").deleteMany({ organizationId: existingOrg._id });
    await db.collection("tasks").deleteMany({ organizationId: existingOrg._id });
    await db.collection("comments").deleteMany({ organizationId: existingOrg._id });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const orgResult = await db.collection("organizations").insertOne({
    name: "Demo Taskflow Co.",
    slug: `demo-taskflow-${Date.now().toString(36)}`,
    plan: "pro",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const organizationId = orgResult.insertedId;

  const teamResult = await db.collection("teams").insertOne({
    name: "Engineering",
    organizationId,
    memberIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const teamId = teamResult.insertedId;

  const users = [
    { name: "Asha Admin", email: "admin@demo.taskflow.app", role: "super_admin" },
    { name: "Vikram Manager", email: "manager@demo.taskflow.app", role: "manager" },
    { name: "Neha Lead", email: "lead@demo.taskflow.app", role: "team_lead" },
    { name: "Rahul Employee", email: "employee@demo.taskflow.app", role: "employee" },
  ];

  const insertedUsers = {};
  for (const u of users) {
    const result = await db.collection("users").insertOne({
      name: u.name,
      email: u.email,
      passwordHash,
      role: u.role,
      organizationId,
      teamId,
      isActive: true,
      refreshTokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    insertedUsers[u.role] = result.insertedId;
  }

  await db.collection("organizations").updateOne(
    { _id: organizationId },
    { $set: { ownerId: insertedUsers.super_admin } }
  );

  const now = new Date();
  const inDays = (n) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  const tasksToInsert = [
    {
      title: "Prepare Q3 client presentation",
      description: "Build the slide deck for the Q3 business review with the Acme account.",
      status: "in_progress",
      priority: "high",
      visibility: "team_only",
      assigneeIds: [insertedUsers.employee],
      dueDate: inDays(3),
    },
    {
      title: "Fix login page mobile layout bug",
      description: "Login form overflows on screens narrower than 360px.",
      status: "need_clarification",
      priority: "medium",
      visibility: "public",
      assigneeIds: [insertedUsers.employee],
      dueDate: inDays(1),
    },
    {
      title: "Renew enterprise SaaS contract",
      description: "Confidential — review terms before renewal call with vendor.",
      status: "todo",
      priority: "urgent",
      visibility: "confidential",
      assigneeIds: [insertedUsers.manager],
      dueDate: inDays(5),
    },
    {
      title: "Submit monthly expense report",
      description: "Compile and submit October expense report.",
      status: "under_review",
      priority: "low",
      visibility: "private",
      assigneeIds: [insertedUsers.employee],
      dueDate: inDays(-1),
    },
    {
      title: "Onboard new hire — Engineering",
      description: "Complete onboarding checklist for the new backend engineer joining next week.",
      status: "completed",
      priority: "medium",
      visibility: "team_only",
      assigneeIds: [insertedUsers.team_lead],
      dueDate: inDays(-2),
      completedAt: now,
    },
  ];

  const insertedTaskIds = [];
  for (const t of tasksToInsert) {
    const result = await db.collection("tasks").insertOne({
      ...t,
      organizationId,
      teamId,
      createdBy: insertedUsers.manager,
      watcherIds: [],
      isSubtask: false,
      isRecurringTemplate: false,
      attachments: [],
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    insertedTaskIds.push(result.insertedId);
  }

  // Sample discussion thread on the "need_clarification" task
  await db.collection("comments").insertMany([
    {
      taskId: insertedTaskIds[1],
      organizationId,
      authorId: insertedUsers.employee,
      body: "Should this fix also cover tablet widths, or just phones under 360px?",
      isClarificationRequest: true,
      isInternal: false,
      isDecision: false,
      mentions: [insertedUsers.manager],
      attachments: [],
      readBy: [],
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2),
    },
    {
      taskId: insertedTaskIds[1],
      organizationId,
      authorId: insertedUsers.manager,
      body: "Just phones under 360px for now — tablets render fine. We'll scope a separate task if that changes.",
      isClarificationRequest: false,
      isInternal: false,
      isDecision: true,
      mentions: [],
      attachments: [],
      readBy: [],
      createdAt: new Date(now.getTime() - 1000 * 60 * 60),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60),
    },
  ]);

  console.log("\nSeed complete!\n");
  console.log("Demo organization:", "Demo Taskflow Co.");
  console.log("Password for all accounts:", DEMO_PASSWORD);
  console.log("\nLogins:");
  users.forEach((u) => console.log(`  ${u.role.padEnd(12)} -> ${u.email}`));
  console.log("");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
