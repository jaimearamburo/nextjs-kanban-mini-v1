import { beforeEach, describe, expect, test } from "vitest";
import { wipeDatabase } from "@/lib/db/reset";
import type { Priority, Status } from "@/lib/generated/prisma/enums";
import { testDb } from "@/test/database";
import { createBoard } from "./board";

const board = createBoard(testDb);

beforeEach(async () => {
  await wipeDatabase(testDb);
});

// Arrange-only fixtures: written straight to the database, because the Board
// module has no way to create Tasks yet. Assertions go through the Board module only.
async function givenTask(task: {
  title: string;
  status?: Status;
  rank: string;
  priority?: Priority;
  archived?: boolean;
  id?: string;
}) {
  return testDb.task.create({
    data: {
      id: task.id,
      title: task.title,
      status: task.status ?? "TODO",
      rank: task.rank,
      priority: task.priority,
      archivedAt: task.archived ? new Date() : null,
    },
  });
}

function titlesByStatus(statuses: { status: Status; tasks: { title: string }[] }[]) {
  return statuses.map(({ status, tasks }) => [
    status,
    tasks.map((task) => task.title),
  ]);
}

describe("getBoard", () => {
  test("lists every Status in workflow order, each with its Tasks in Rank order", async () => {
    await givenTask({ title: "Second to do", status: "TODO", rank: "a1" });
    await givenTask({ title: "Only done", status: "DONE", rank: "a0" });
    await givenTask({ title: "First to do", status: "TODO", rank: "a0" });
    await givenTask({ title: "Third to do", status: "TODO", rank: "a2" });

    const { statuses } = await board.getBoard();

    expect(titlesByStatus(statuses)).toEqual([
      ["TODO", ["First to do", "Second to do", "Third to do"]],
      ["IN_PROGRESS", []],
      ["IN_REVIEW", []],
      ["DONE", ["Only done"]],
    ]);
  });

  test("breaks Rank ties by Task id, so every Guest sees the same order", async () => {
    await givenTask({ id: "00000000-0000-7000-8000-000000000002", title: "Higher id", rank: "a0" });
    await givenTask({ id: "00000000-0000-7000-8000-000000000001", title: "Lower id", rank: "a0" });

    const { statuses } = await board.getBoard();

    expect(statuses[0].tasks.map((task) => task.title)).toEqual(["Lower id", "Higher id"]);
  });

  test("orders Rank by byte value, so uppercase keys sort before lowercase ones", async () => {
    // Fractional-index keys use 0-9, A-Z, a-z in byte order. A linguistic
    // collation would put "a0" before "Zz".
    await givenTask({ title: "Lowercase key", rank: "a0" });
    await givenTask({ title: "Uppercase key", rank: "Zz" });

    const { statuses } = await board.getBoard();

    expect(statuses[0].tasks.map((task) => task.title)).toEqual(["Uppercase key", "Lowercase key"]);
  });

  test("leaves Archived Tasks off the Board", async () => {
    await givenTask({ title: "Still here", rank: "a0" });
    await givenTask({ title: "Archived", rank: "a1", archived: true });

    const { statuses } = await board.getBoard();

    expect(titlesByStatus(statuses)[0]).toEqual(["TODO", ["Still here"]]);
  });

  test("shows each card's Priority, Labels in Label order, and Assignee", async () => {
    await testDb.label.createMany({
      data: [
        { id: "docs", name: "Docs", color: "amber", position: 1 },
        { id: "bug", name: "Bug", color: "red", position: 0 },
      ],
    });
    const maya = await testDb.teamMember.create({
      data: { name: "Maya Chen", color: "violet", position: 0 },
    });
    await testDb.task.create({
      data: {
        title: "Assigned",
        rank: "a0",
        priority: "HIGH",
        assigneeId: maya.id,
        labels: { connect: [{ id: "docs" }, { id: "bug" }] },
      },
    });
    await givenTask({ title: "Unassigned", rank: "a1" });

    const { statuses } = await board.getBoard();

    expect(statuses[0].tasks).toEqual([
      expect.objectContaining({
        title: "Assigned",
        priority: "HIGH",
        labels: [
          { id: "bug", name: "Bug", color: "red" },
          { id: "docs", name: "Docs", color: "amber" },
        ],
        assignee: { id: maya.id, name: "Maya Chen", color: "violet" },
      }),
      expect.objectContaining({
        title: "Unassigned",
        priority: "NONE",
        labels: [],
        assignee: null,
      }),
    ]);
  });
});

describe("getTask", () => {
  test("shows the Task's title, description, Status, Priority, Assignee and Labels in Label order", async () => {
    await testDb.label.createMany({
      data: [
        { id: "docs", name: "Docs", color: "amber", position: 1 },
        { id: "bug", name: "Bug", color: "red", position: 0 },
      ],
    });
    const maya = await testDb.teamMember.create({
      data: { name: "Maya Chen", color: "violet", position: 0 },
    });
    const task = await testDb.task.create({
      data: {
        title: "Fix the modal",
        description: "It doesn't close on back.",
        status: "IN_REVIEW",
        rank: "a0",
        priority: "HIGH",
        assigneeId: maya.id,
        labels: { connect: [{ id: "docs" }, { id: "bug" }] },
      },
    });

    expect(await board.getTask(task.id)).toEqual({
      id: task.id,
      title: "Fix the modal",
      description: "It doesn't close on back.",
      status: "IN_REVIEW",
      priority: "HIGH",
      labels: [
        { id: "bug", name: "Bug", color: "red" },
        { id: "docs", name: "Docs", color: "amber" },
      ],
      assignee: { id: maya.id, name: "Maya Chen", color: "violet" },
    });
  });

  test("doesn't find an Archived Task", async () => {
    const task = await givenTask({ title: "Archived", rank: "a0", archived: true });

    expect(await board.getTask(task.id)).toBeNull();
  });

  test("doesn't find an unknown or malformed Task id", async () => {
    expect(await board.getTask("00000000-0000-7000-8000-000000000001")).toBeNull();
    expect(await board.getTask("not-a-task")).toBeNull();
  });
});

describe("listLabels", () => {
  test("lists every Label in its fixed order", async () => {
    await testDb.label.createMany({
      data: [
        { id: "infra", name: "Infra", color: "slate", position: 2 },
        { id: "frontend", name: "Frontend", color: "blue", position: 0 },
        { id: "backend", name: "Backend", color: "green", position: 1 },
      ],
    });

    expect(await board.listLabels()).toEqual([
      { id: "frontend", name: "Frontend", color: "blue" },
      { id: "backend", name: "Backend", color: "green" },
      { id: "infra", name: "Infra", color: "slate" },
    ]);
  });
});

describe("listTeamMembers", () => {
  test("lists the Team Member roster in its fixed order", async () => {
    await testDb.teamMember.createMany({
      data: [
        { name: "Sam Rivera", color: "sky", position: 1 },
        { name: "Ava Moreau", color: "teal", position: 2 },
        { name: "Leo Okafor", color: "emerald", position: 0 },
      ],
    });

    const roster = await board.listTeamMembers();

    expect(roster.map((member) => member.name)).toEqual([
      "Leo Okafor",
      "Sam Rivera",
      "Ava Moreau",
    ]);
  });
});

/** The Priority the Board shows for a Task, or undefined if it's not on the Board. */
async function shownPriority(taskId: string) {
  const { statuses } = await board.getBoard();
  return statuses.flatMap(({ tasks }) => tasks).find((task) => task.id === taskId)?.priority;
}

describe("setPriority", () => {
  /** The Guest acting in each write. */
  const givenGuest = () =>
    testDb.guest.create({ data: { name: "Brave Fox", color: "violet" } });

  test("saves the final value it is given", async () => {
    const task = await givenTask({ title: "Triage me", rank: "a0", priority: "LOW" });
    const guest = await givenGuest();

    const result = await board.setPriority(guest, { taskId: task.id, priority: "URGENT" });

    expect(result).toEqual({ ok: true });
    expect(await shownPriority(task.id)).toBe("URGENT");
  });

  test("is idempotent: Guests clicking at the same moment never skip a level", async () => {
    const task = await givenTask({ title: "Contested", rank: "a0", priority: "LOW" });
    const guests = await Promise.all(Array.from({ length: 5 }, givenGuest));

    // Five Guests all see Low and click once, so each sends "set Medium".
    const results = await Promise.all(
      guests.map((guest) => board.setPriority(guest, { taskId: task.id, priority: "MEDIUM" })),
    );

    expect(results).toEqual(Array(5).fill({ ok: true }));
    expect(await shownPriority(task.id)).toBe("MEDIUM");
  });

  test("rejects a Priority outside the fixed set at the Zod boundary", async () => {
    const task = await givenTask({ title: "Unchanged", rank: "a0", priority: "LOW" });
    const guest = await givenGuest();

    const result = await board.setPriority(guest, { taskId: task.id, priority: "CRITICAL" });

    expect(result).toEqual({ ok: false, error: "Invalid input." });
    expect(await shownPriority(task.id)).toBe("LOW");
  });

  test("refuses an Archived Task", async () => {
    const task = await givenTask({ title: "Archived", rank: "a0", archived: true });
    const guest = await givenGuest();

    const result = await board.setPriority(guest, { taskId: task.id, priority: "HIGH" });

    expect(result).toEqual({ ok: false, error: "This Task no longer exists." });
  });
});
