import { generateNKeysBetween } from "fractional-indexing";
import type { Priority, Status } from "@/lib/generated/prisma/enums";
import type { Database } from "./client";
import { wipeDatabase } from "./reset";

const labels = [
  { id: "frontend", name: "Frontend", color: "blue" },
  { id: "backend", name: "Backend", color: "green" },
  { id: "bug", name: "Bug", color: "red" },
  { id: "design", name: "Design", color: "purple" },
  { id: "docs", name: "Docs", color: "amber" },
  { id: "infra", name: "Infra", color: "slate" },
] as const;

type LabelId = (typeof labels)[number]["id"];

const teamMembers = [
  { name: "Maya Chen", color: "violet" },
  { name: "Leo Okafor", color: "emerald" },
  { name: "Priya Raman", color: "rose" },
  { name: "Sam Rivera", color: "sky" },
  { name: "Noah Lindqvist", color: "orange" },
  { name: "Ava Moreau", color: "teal" },
] as const;

type TeamMemberName = (typeof teamMembers)[number]["name"];

type SeedTask = {
  title: string;
  description: string;
  priority: Priority;
  labels: LabelId[];
  assignee: TeamMemberName | null;
  comments?: { author: TeamMemberName; body: string }[];
};

/** The demo Board: Tasks about building this very app, in Rank order per Status. */
const tasksByStatus: Record<Status, SeedTask[]> = {
  TODO: [
    {
      title: "Command palette with ⌘K",
      description:
        "Find and open Tasks, create a Task, switch the theme and open the demo controls from the keyboard.",
      priority: "MEDIUM",
      labels: ["frontend"],
      assignee: "Maya Chen",
    },
    {
      title: "Edge-drag between columns on mobile",
      description:
        "Dragging a card to the screen edge advances the carousel to the neighbouring Status and allows a drop there.",
      priority: "HIGH",
      labels: ["frontend", "design"],
      assignee: null,
    },
    {
      title: "Light, Dark and System themes",
      description:
        "Read the theme cookie in a small head script so the first paint is already in the right theme.",
      priority: "NONE",
      labels: ["frontend", "design"],
      assignee: "Ava Moreau",
    },
    {
      title: "Write the README and architecture overview",
      description:
        "Explain the Board module, the caching strategy and how real-time invalidation works.",
      priority: "LOW",
      labels: ["docs"],
      assignee: "Noah Lindqvist",
    },
  ],
  IN_PROGRESS: [
    {
      title: "Fractional Rank for moves",
      description:
        "Work out the Rank between the neighbouring Tasks so a move writes only the moved Task's row.",
      priority: "URGENT",
      labels: ["backend"],
      assignee: "Leo Okafor",
      comments: [
        {
          author: "Leo Okafor",
          body: "Going with base-62 keys and a C collation on the column so ordering is identical on any provider.",
        },
        {
          author: "Priya Raman",
          body: "Nice. Ties broken by id should make concurrent drops into the same gap deterministic.",
        },
      ],
    },
    {
      title: "Jira-style drop line for drag and drop",
      description:
        "A thin accent line with a leading dot shows where the card will land, without the other cards moving.",
      priority: "HIGH",
      labels: ["frontend", "design"],
      assignee: "Maya Chen",
    },
    {
      title: "Optimistic priority cycling",
      description:
        "Clicking the priority icon cycles None → Low → Medium → High → Urgent instantly, sending the final value.",
      priority: "MEDIUM",
      labels: ["frontend"],
      assignee: "Sam Rivera",
    },
    {
      title: "Ably token Route Handler",
      description:
        "Issue short-lived Ably tokens with the Guest id as the client id. The API key never reaches the browser.",
      priority: "HIGH",
      labels: ["backend", "infra"],
      assignee: null,
    },
  ],
  IN_REVIEW: [
    {
      title: "Fix the modal not closing on back",
      description:
        "Pressing the browser back button should close the Task modal and return to the Board as it was.",
      priority: "URGENT",
      labels: ["bug", "frontend"],
      assignee: "Sam Rivera",
      comments: [
        {
          author: "Maya Chen",
          body: "Reproduced on Safari only. The parallel route slot needs a default.tsx.",
        },
      ],
    },
    {
      title: "Label Filter in the URL",
      description:
        "Selected Labels live in the `labels` search param so a filtered view can be shared.",
      priority: "MEDIUM",
      labels: ["frontend"],
      assignee: "Priya Raman",
    },
    {
      title: "Archive Comments instead of deleting them",
      description:
        "Deleting a Comment archives it. It disappears from the Task but stays in the database.",
      priority: "LOW",
      labels: ["backend"],
      assignee: "Leo Okafor",
    },
  ],
  DONE: [
    {
      title: "Walking skeleton deployed to Vercel",
      description:
        "The seeded Board renders read-only from the production database, with the function region next to the database.",
      priority: "HIGH",
      labels: ["infra"],
      assignee: "Noah Lindqvist",
      comments: [
        {
          author: "Noah Lindqvist",
          body: "Only Production builds run prisma migrate deploy. Previews never migrate.",
        },
      ],
    },
    {
      title: "Prisma schema and seed data",
      description:
        "Every entity in the spec, so later work needs no schema changes.",
      priority: "MEDIUM",
      labels: ["backend"],
      assignee: "Leo Okafor",
    },
    {
      title: "Board skeleton while data streams in",
      description:
        "The static shell ships a skeleton, and the Board streams in behind a Suspense boundary.",
      priority: "LOW",
      labels: ["frontend", "design"],
      assignee: "Ava Moreau",
    },
    {
      title: "Keep production out of reach of dev and tests",
      description:
        "Reset and seed scripts refuse the production database host.",
      priority: "NONE",
      labels: ["infra", "docs"],
      assignee: null,
    },
    {
      title: "Error boundary with retry",
      description:
        "Unexpected errors land in an error boundary that can re-fetch and re-render the Board.",
      priority: "LOW",
      labels: ["frontend", "bug"],
      assignee: "Priya Raman",
    },
  ],
};

/** Replaces everything in the database with the demo Board. */
export async function seedDatabase(db: Database) {
  await wipeDatabase(db);

  await db.label.createMany({
    data: labels.map((label, position) => ({ ...label, position })),
  });

  const members = await db.teamMember.createManyAndReturn({
    data: teamMembers.map((member, position) => ({ ...member, position })),
  });
  const memberId = new Map(members.map((m) => [m.name, m.id]));

  let tasks = 0;
  let comments = 0;
  for (const [status, seedTasks] of Object.entries(tasksByStatus) as [
    Status,
    SeedTask[],
  ][]) {
    const ranks = generateNKeysBetween(null, null, seedTasks.length);
    for (const [index, task] of seedTasks.entries()) {
      await db.task.create({
        data: {
          title: task.title,
          description: task.description,
          status,
          rank: ranks[index],
          priority: task.priority,
          assigneeId: task.assignee ? memberId.get(task.assignee) : null,
          labels: { connect: task.labels.map((id) => ({ id })) },
          comments: {
            create: (task.comments ?? []).map((comment) => ({
              body: comment.body,
              authorTeamMemberId: memberId.get(comment.author),
            })),
          },
        },
      });
      tasks += 1;
      comments += task.comments?.length ?? 0;
    }
  }

  return {
    tasks,
    labels: labels.length,
    teamMembers: teamMembers.length,
    comments,
  };
}
