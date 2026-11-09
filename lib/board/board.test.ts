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
  description?: string;
  labels?: string[];
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
      description: task.description,
      labels: task.labels && { connect: task.labels.map((id) => ({ id })) },
      status: task.status ?? "TODO",
      rank: task.rank,
      priority: task.priority,
      archivedAt: task.archived ? new Date() : null,
    },
  });
}

/** A Guest to act in a write. */
function givenGuest() {
  return testDb.guest.create({ data: { name: "Brave Fox", color: "violet" } });
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

describe("getBoard with a Label Filter and search", () => {
  beforeEach(async () => {
    await testDb.label.createMany({
      data: [
        { id: "frontend", name: "Frontend", color: "blue", position: 0 },
        { id: "backend", name: "Backend", color: "green", position: 1 },
        { id: "bug", name: "Bug", color: "red", position: 2 },
      ],
    });
  });

  async function shownTitles(searchParams: unknown) {
    const { statuses } = await board.getBoard(searchParams);
    return statuses.flatMap(({ tasks }) => tasks.map((task) => task.title));
  }

  test("shows Tasks with any of the selected Labels", async () => {
    await givenTask({ title: "Frontend only", rank: "a0", labels: ["frontend"] });
    await givenTask({ title: "Bug only", rank: "a1", labels: ["bug"] });
    await givenTask({ title: "Backend only", rank: "a2", labels: ["backend"] });
    await givenTask({ title: "Frontend bug", rank: "a3", labels: ["frontend", "bug"] });
    await givenTask({ title: "No Labels", rank: "a4" });

    expect(await shownTitles({ labels: "frontend,bug" })).toEqual([
      "Frontend only",
      "Bug only",
      "Frontend bug",
    ]);
  });

  test("search matches the title or description, ignoring case", async () => {
    await givenTask({ title: "Fix the MODAL", rank: "a0" });
    await givenTask({ title: "Polish", description: "The modal flickers.", rank: "a1" });
    await givenTask({ title: "Unrelated", description: "Nothing here.", rank: "a2" });

    expect(await shownTitles({ q: "modal" })).toEqual(["Fix the MODAL", "Polish"]);
  });

  test("Labels combined with search narrow the Board to Tasks matching both", async () => {
    await givenTask({ title: "Modal bug", rank: "a0", labels: ["bug"] });
    await givenTask({ title: "Modal styles", rank: "a1", labels: ["frontend"] });
    await givenTask({ title: "Modal API", rank: "a2", labels: ["backend"] });
    await givenTask({ title: "Toast bug", rank: "a3", labels: ["bug"] });

    expect(await shownTitles({ labels: "bug,frontend", q: "modal" })).toEqual([
      "Modal bug",
      "Modal styles",
    ]);
  });

  test("search takes % and _ literally, not as wildcards", async () => {
    await givenTask({ title: "Cut load time by 50%", rank: "a0" });
    await givenTask({ title: "Rename user_id", rank: "a1" });
    await givenTask({ title: "Plain title", rank: "a2" });

    expect(await shownTitles({ q: "%" })).toEqual(["Cut load time by 50%"]);
    expect(await shownTitles({ q: "_" })).toEqual(["Rename user_id"]);
  });

  test("ignores invalid search params, keeping any valid Labels", async () => {
    await givenTask({ title: "Frontend", rank: "a0", labels: ["frontend"] });
    await givenTask({ title: "Backend", rank: "a1", labels: ["backend"] });
    const everyTask = ["Frontend", "Backend"];

    // Malformed or unknown Label ids are dropped; the valid ones still filter.
    expect(await shownTitles({ labels: "'; DROP TABLE,frontend,nope" })).toEqual(["Frontend"]);
    expect(await shownTitles({ labels: ["backend", "BACKEND!"] })).toEqual(["Backend"]);
    // With nothing valid left, the Board is unfiltered.
    expect(await shownTitles({ labels: "nope,,," })).toEqual(everyTask);
    expect(await shownTitles({ labels: 42, q: { nested: true } })).toEqual(everyTask);
    expect(await shownTitles({ q: "   " })).toEqual(everyTask);
    expect(await shownTitles("not an object")).toEqual(everyTask);
    expect(await shownTitles(null)).toEqual(everyTask);
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

describe("moveTask", () => {
  /** The titles the Board shows in one Status, in Rank order. */
  async function shownTitles(status: Status) {
    const { statuses } = await board.getBoard();
    return statuses.find((column) => column.status === status)!.tasks.map((task) => task.title);
  }

  test("moves a Task to another Status, between the two cards it was dropped between", async () => {
    const moving = await givenTask({ title: "Moving", status: "TODO", rank: "a0" });
    const first = await givenTask({ title: "First", status: "IN_PROGRESS", rank: "a0" });
    const second = await givenTask({ title: "Second", status: "IN_PROGRESS", rank: "a1" });
    const guest = await givenGuest();

    const result = await board.moveTask(guest, {
      taskId: moving.id,
      status: "IN_PROGRESS",
      beforeId: first.id,
      afterId: second.id,
    });

    expect(result).toEqual({ ok: true });
    expect(await shownTitles("TODO")).toEqual([]);
    expect(await shownTitles("IN_PROGRESS")).toEqual(["First", "Moving", "Second"]);
  });

  test("reorders a Task within its Status", async () => {
    const a = await givenTask({ title: "A", rank: "a0" });
    const b = await givenTask({ title: "B", rank: "a1" });
    const c = await givenTask({ title: "C", rank: "a2" });
    const guest = await givenGuest();

    const result = await board.moveTask(guest, {
      taskId: a.id,
      status: "TODO",
      beforeId: b.id,
      afterId: c.id,
    });

    expect(result).toEqual({ ok: true });
    expect(await shownTitles("TODO")).toEqual(["B", "A", "C"]);
  });

  test("inserts at the top of a Status", async () => {
    const top = await givenTask({ title: "Top", status: "DONE", rank: "a0" });
    await givenTask({ title: "Bottom", status: "DONE", rank: "a1" });
    const moving = await givenTask({ title: "Moving", rank: "a0" });
    const guest = await givenGuest();

    await board.moveTask(guest, { taskId: moving.id, status: "DONE", beforeId: null, afterId: top.id });

    expect(await shownTitles("DONE")).toEqual(["Moving", "Top", "Bottom"]);
  });

  test("inserts at the bottom of a Status", async () => {
    await givenTask({ title: "Top", status: "DONE", rank: "a0" });
    const bottom = await givenTask({ title: "Bottom", status: "DONE", rank: "a1" });
    const moving = await givenTask({ title: "Moving", rank: "a0" });
    const guest = await givenGuest();

    await board.moveTask(guest, { taskId: moving.id, status: "DONE", beforeId: bottom.id, afterId: null });

    expect(await shownTitles("DONE")).toEqual(["Top", "Bottom", "Moving"]);
  });

  test("moves into an empty Status", async () => {
    const moving = await givenTask({ title: "Moving", rank: "a0" });
    const guest = await givenGuest();

    await board.moveTask(guest, { taskId: moving.id, status: "IN_REVIEW", beforeId: null, afterId: null });

    expect(await shownTitles("TODO")).toEqual([]);
    expect(await shownTitles("IN_REVIEW")).toEqual(["Moving"]);
  });

  test("two concurrent moves into the same gap both land in it, in one order every Guest sees", async () => {
    const a = await givenTask({ title: "A", rank: "a0" });
    const b = await givenTask({ title: "B", rank: "a1" });
    const x = await givenTask({ title: "X", status: "DONE", rank: "a0" });
    const y = await givenTask({ title: "Y", status: "DONE", rank: "a1" });
    const [first, second] = await Promise.all([givenGuest(), givenGuest()]);

    // Both Guests drop into the gap between A and B at the same moment.
    const results = await Promise.all([
      board.moveTask(first, { taskId: x.id, status: "TODO", beforeId: a.id, afterId: b.id }),
      board.moveTask(second, { taskId: y.id, status: "TODO", beforeId: a.id, afterId: b.id }),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }]);
    const shown = await shownTitles("TODO");
    expect([shown[0], shown[3]]).toEqual(["A", "B"]);
    expect(shown.slice(1, 3).sort()).toEqual(["X", "Y"]);
    expect(await shownTitles("TODO")).toEqual(shown);
  });

  test("drops into the same gap take different Ranks, so a later drop between them lands exactly there", async () => {
    // Each drop picks a Rank at random from several between its neighbours.
    const draws = [0.1, 0.9];
    const jittered = createBoard(testDb, { random: () => draws.shift() ?? 0.5 });
    const a = await givenTask({ title: "A", rank: "a0" });
    const b = await givenTask({ title: "B", rank: "a1" });
    const x = await givenTask({ id: "00000000-0000-7000-8000-000000000001", title: "X", status: "DONE", rank: "a0" });
    const y = await givenTask({ id: "00000000-0000-7000-8000-000000000002", title: "Y", status: "DONE", rank: "a1" });
    // The highest id, so sharing a tied Rank would put it after both.
    const z = await givenTask({ id: "00000000-0000-7000-8000-000000000003", title: "Z", status: "DONE", rank: "a2" });
    const guest = await givenGuest();
    // Both dropped into the A–B gap as their Guests saw it. Only the
    // neighbours shape the Rank, so one after the other computes what
    // concurrent drops would, with a known draw for each.
    await jittered.moveTask(guest, { taskId: x.id, status: "TODO", beforeId: a.id, afterId: b.id });
    await jittered.moveTask(guest, { taskId: y.id, status: "TODO", beforeId: a.id, afterId: b.id });

    const result = await jittered.moveTask(guest, {
      taskId: z.id,
      status: "TODO",
      beforeId: x.id,
      afterId: y.id,
    });

    expect(result).toEqual({ ok: true });
    expect(await shownTitles("TODO")).toEqual(["A", "X", "Z", "Y", "B"]);
  });

  test("a drop between two Tasks whose Ranks tied still succeeds, keeping the order deterministic", async () => {
    const lower = await givenTask({ id: "00000000-0000-7000-8000-000000000001", title: "Lower id", rank: "a0" });
    const higher = await givenTask({ id: "00000000-0000-7000-8000-000000000002", title: "Higher id", rank: "a0" });
    const moving = await givenTask({ id: "00000000-0000-7000-8000-000000000003", title: "Moving", status: "DONE", rank: "a0" });
    const guest = await givenGuest();

    const result = await board.moveTask(guest, {
      taskId: moving.id,
      status: "TODO",
      beforeId: lower.id,
      afterId: higher.id,
    });

    // No Rank lies strictly between equal Ranks and only the moved Task is
    // written, so it shares theirs and lands by Task id, inside the tie.
    expect(result).toEqual({ ok: true });
    expect(await shownTitles("TODO")).toEqual(["Lower id", "Higher id", "Moving"]);
  });

  test("refuses a neighbour that isn't on the Board in the target Status as a changed Board, leaving the Task in place", async () => {
    const moving = await givenTask({ title: "Moving", rank: "a0" });
    const elsewhere = await givenTask({ title: "Elsewhere", status: "DONE", rank: "a0" });
    const archived = await givenTask({ title: "Archived", status: "IN_PROGRESS", rank: "a0", archived: true });
    const target = await givenTask({ title: "Target", status: "IN_PROGRESS", rank: "a1" });
    const guest = await givenGuest();
    const unknownId = "00000000-0000-7000-8000-000000000099";

    const moves = [
      { beforeId: unknownId, afterId: null },
      { beforeId: null, afterId: unknownId },
      { beforeId: elsewhere.id, afterId: null },
      { beforeId: archived.id, afterId: target.id },
      { beforeId: moving.id, afterId: null },
    ];
    // Another Guest changed the Board while this one was dragging.
    for (const neighbours of moves) {
      const result = await board.moveTask(guest, { taskId: moving.id, status: "IN_PROGRESS", ...neighbours });
      expect(result).toEqual({ ok: false, error: "The Board changed while you were dragging. Try again." });
    }
    // A malformed id is just bad input.
    const malformed = await board.moveTask(guest, {
      taskId: moving.id,
      status: "IN_PROGRESS",
      beforeId: "not-a-task",
      afterId: null,
    });
    expect(malformed).toEqual({ ok: false, error: "Invalid input." });

    expect(await shownTitles("TODO")).toEqual(["Moving"]);
    expect(await shownTitles("IN_PROGRESS")).toEqual(["Target"]);
  });

  test("refuses neighbours no longer in that order as a changed Board", async () => {
    const moving = await givenTask({ title: "Moving", rank: "a0" });
    const first = await givenTask({ title: "First", status: "DONE", rank: "a0" });
    const second = await givenTask({ title: "Second", status: "DONE", rank: "a1" });
    const guest = await givenGuest();

    const result = await board.moveTask(guest, {
      taskId: moving.id,
      status: "DONE",
      beforeId: second.id,
      afterId: first.id,
    });

    expect(result).toEqual({ ok: false, error: "The Board changed while you were dragging. Try again." });
    expect(await shownTitles("DONE")).toEqual(["First", "Second"]);
  });

  test("refuses an Archived Task", async () => {
    const moving = await givenTask({ title: "Archived", rank: "a0", archived: true });
    const guest = await givenGuest();

    const result = await board.moveTask(guest, { taskId: moving.id, status: "DONE", beforeId: null, afterId: null });

    expect(result).toEqual({ ok: false, error: "This Task no longer exists." });
  });
});

describe("setStatus", () => {
  test("puts the Task at the top of its new Status", async () => {
    const task = await givenTask({ title: "Moving", status: "TODO", rank: "a0" });
    await givenTask({ title: "Was first", status: "DONE", rank: "a1" });
    await givenTask({ title: "Was second", status: "DONE", rank: "a2" });
    const guest = await givenGuest();

    const result = await board.setStatus(guest, { taskId: task.id, status: "DONE" });

    expect(result).toEqual({ ok: true });
    const { statuses } = await board.getBoard();
    expect(titlesByStatus(statuses)).toEqual([
      ["TODO", []],
      ["IN_PROGRESS", []],
      ["IN_REVIEW", []],
      ["DONE", ["Moving", "Was first", "Was second"]],
    ]);
  });

  test("leaves a Task where it is when the Status is the one it already has", async () => {
    await givenTask({ title: "First", status: "TODO", rank: "a0" });
    const second = await givenTask({ title: "Second", status: "TODO", rank: "a1" });
    const guest = await givenGuest();

    const result = await board.setStatus(guest, { taskId: second.id, status: "TODO" });

    expect(result).toEqual({ ok: true });
    const { statuses } = await board.getBoard();
    expect(statuses[0].tasks.map((task) => task.title)).toEqual(["First", "Second"]);
  });

  test("rejects a Status outside the fixed set at the Zod boundary", async () => {
    const task = await givenTask({ title: "Unchanged", status: "TODO", rank: "a0" });
    const guest = await givenGuest();

    const result = await board.setStatus(guest, { taskId: task.id, status: "BLOCKED" });

    expect(result).toEqual({ ok: false, error: "Invalid input." });
  });

  test("refuses an Archived Task", async () => {
    const task = await givenTask({ title: "Archived", rank: "a0", archived: true });
    const guest = await givenGuest();

    const result = await board.setStatus(guest, { taskId: task.id, status: "DONE" });

    expect(result).toEqual({ ok: false, error: "This Task no longer exists." });
  });
});

function givenTeamMember(name: string, position: number) {
  return testDb.teamMember.create({ data: { name, color: "sky", position } });
}

function givenLabels() {
  return testDb.label.createMany({
    data: [
      { id: "bug", name: "Bug", color: "red", position: 0 },
      { id: "docs", name: "Docs", color: "amber", position: 1 },
    ],
  });
}

describe("setAssignee", () => {
  test("assigns a Team Member from the roster", async () => {
    const task = await givenTask({ title: "Needs an owner", rank: "a0" });
    const member = await givenTeamMember("Sam Rivera", 0);
    const guest = await givenGuest();

    const result = await board.setAssignee(guest, { taskId: task.id, assigneeId: member.id });

    expect(result).toEqual({ ok: true });
    expect((await board.getTask(task.id))?.assignee?.name).toBe("Sam Rivera");
  });

  test("unassigns with null", async () => {
    const member = await givenTeamMember("Sam Rivera", 0);
    const task = await givenTask({ title: "Owned", rank: "a0" });
    const guest = await givenGuest();
    await board.setAssignee(guest, { taskId: task.id, assigneeId: member.id });

    const result = await board.setAssignee(guest, { taskId: task.id, assigneeId: null });

    expect(result).toEqual({ ok: true });
    expect((await board.getTask(task.id))?.assignee).toBeNull();
  });

  test.each([
    ["a malformed id", "not-a-uuid"],
    ["an id off the roster", "00000000-0000-7000-8000-000000000009"],
  ])("rejects %s", async (_name, assigneeId) => {
    const task = await givenTask({ title: "Unchanged", rank: "a0" });
    const guest = await givenGuest();

    const result = await board.setAssignee(guest, { taskId: task.id, assigneeId });

    expect(result).toEqual({ ok: false, error: "Invalid input." });
    expect((await board.getTask(task.id))?.assignee).toBeNull();
  });

  test("refuses an Archived Task", async () => {
    const task = await givenTask({ title: "Archived", rank: "a0", archived: true });
    const guest = await givenGuest();

    const result = await board.setAssignee(guest, { taskId: task.id, assigneeId: null });

    expect(result).toEqual({ ok: false, error: "This Task no longer exists." });
  });
});

describe("setLabels", () => {
  test("replaces the Task's Labels with the final set given", async () => {
    await givenLabels();
    const task = await givenTask({ title: "Relabel", rank: "a0", labels: ["bug"] });
    const guest = await givenGuest();

    const result = await board.setLabels(guest, { taskId: task.id, labelIds: ["docs"] });

    expect(result).toEqual({ ok: true });
    expect((await board.getTask(task.id))?.labels.map((label) => label.id)).toEqual(["docs"]);
  });

  test("clears every Label with an empty set", async () => {
    await givenLabels();
    const task = await givenTask({ title: "Relabel", rank: "a0", labels: ["bug", "docs"] });
    const guest = await givenGuest();

    await board.setLabels(guest, { taskId: task.id, labelIds: [] });

    expect((await board.getTask(task.id))?.labels).toEqual([]);
  });

  test.each([
    ["a malformed id", "NOT A LABEL"],
    ["an id outside the fixed set", "wontfix"],
  ])("rejects %s", async (_name, labelId) => {
    await givenLabels();
    const task = await givenTask({ title: "Unchanged", rank: "a0", labels: ["bug"] });
    const guest = await givenGuest();

    const result = await board.setLabels(guest, { taskId: task.id, labelIds: ["docs", labelId] });

    expect(result).toEqual({ ok: false, error: "Invalid input." });
    expect((await board.getTask(task.id))?.labels.map((label) => label.id)).toEqual(["bug"]);
  });

  test("refuses an Archived Task", async () => {
    await givenLabels();
    const task = await givenTask({ title: "Archived", rank: "a0", archived: true });
    const guest = await givenGuest();

    const result = await board.setLabels(guest, { taskId: task.id, labelIds: ["bug"] });

    expect(result).toEqual({ ok: false, error: "This Task no longer exists." });
  });
});

describe("last write wins per field", () => {
  test("a later write to a field replaces an earlier one", async () => {
    const task = await givenTask({ title: "Contested", rank: "a0" });
    const first = await givenTeamMember("Sam Rivera", 0);
    const second = await givenTeamMember("Ava Moreau", 1);
    const guest = await givenGuest();

    await board.setAssignee(guest, { taskId: task.id, assigneeId: first.id });
    await board.setAssignee(guest, { taskId: task.id, assigneeId: second.id });

    expect((await board.getTask(task.id))?.assignee?.name).toBe("Ava Moreau");
  });

  test("simultaneous writes to different fields all land", async () => {
    await givenLabels();
    const task = await givenTask({ title: "Busy", status: "TODO", rank: "a0" });
    const member = await givenTeamMember("Sam Rivera", 0);
    const guest = await givenGuest();

    const results = await Promise.all([
      board.setStatus(guest, { taskId: task.id, status: "DONE" }),
      board.setPriority(guest, { taskId: task.id, priority: "HIGH" }),
      board.setAssignee(guest, { taskId: task.id, assigneeId: member.id }),
      board.setLabels(guest, { taskId: task.id, labelIds: ["bug"] }),
    ]);

    expect(results).toEqual(Array(4).fill({ ok: true }));
    expect(await board.getTask(task.id)).toMatchObject({
      status: "DONE",
      priority: "HIGH",
      assignee: { name: "Sam Rivera" },
      labels: [{ id: "bug" }],
    });
  });
});
