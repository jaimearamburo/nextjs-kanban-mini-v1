import { beforeEach, describe, expect, test } from "vitest";
import { wipeDatabase } from "@/lib/db/reset";
import type { Status } from "@/lib/generated/prisma/enums";
import { testDb } from "@/test/database";
import { createBoard } from "./board";

const board = createBoard(testDb);

beforeEach(async () => {
  await wipeDatabase(testDb);
});

// Arrange-only fixtures, written straight to the database. Assertions go
// through the Board module only.
function givenGuest() {
  return testDb.guest.create({ data: { name: "Brave Fox", color: "violet" } });
}

function givenTask(task: { title: string; status: Status; rank: string }) {
  return testDb.task.create({ data: task });
}

function givenTeamMember() {
  return testDb.teamMember.create({ data: { name: "Maya Chen", color: "teal", position: 1 } });
}

function givenLabels() {
  return testDb.label.createMany({
    data: [
      { id: "frontend", name: "Frontend", color: "blue", position: 1 },
      { id: "bug", name: "Bug", color: "red", position: 2 },
    ],
  });
}

function titlesIn(statuses: { status: Status; tasks: { title: string }[] }[], status: Status) {
  return statuses.find((column) => column.status === status)!.tasks.map((task) => task.title);
}

describe("createTask", () => {
  test("a Task with only a title goes in To Do with no description, Priority None, no Assignee and no Labels", async () => {
    const guest = await givenGuest();

    const result = await board.createTask(guest, { title: "Write the README" });

    expect(result).toEqual({ ok: true, taskId: expect.any(String) });
    if (!result.ok) return;
    expect(await board.getTask(result.taskId)).toEqual({
      id: result.taskId,
      title: "Write the README",
      description: "",
      status: "TODO",
      priority: "NONE",
      assignee: null,
      labels: [],
    });
  });

  test("puts the new Task at the top of its Status, above every Task already there", async () => {
    const guest = await givenGuest();
    // Ranks at both extremes of what a Status can hold: "Zz" sorts before "a0".
    await givenTask({ title: "Was first", status: "IN_REVIEW", rank: "Zz" });
    await givenTask({ title: "Was second", status: "IN_REVIEW", rank: "a0" });

    await board.createTask(guest, { title: "Brand new", status: "IN_REVIEW" });
    await board.createTask(guest, { title: "Newer still", status: "IN_REVIEW" });

    const { statuses } = await board.getBoard();
    expect(titlesIn(statuses, "IN_REVIEW")).toEqual([
      "Newer still",
      "Brand new",
      "Was first",
      "Was second",
    ]);
  });

  test("saves the description, Status, Priority, Assignee and Labels it is given", async () => {
    const guest = await givenGuest();
    const member = await givenTeamMember();
    await givenLabels();

    const result = await board.createTask(guest, {
      title: "  Full Task  ",
      description: "Line one\nLine two",
      status: "DONE",
      priority: "URGENT",
      assigneeId: member.id,
      labelIds: ["bug", "frontend", "bug"],
    });

    if (!result.ok) throw new Error(result.error);
    expect(await board.getTask(result.taskId)).toMatchObject({
      title: "Full Task",
      description: "Line one\nLine two",
      status: "DONE",
      priority: "URGENT",
      assignee: { id: member.id, name: "Maya Chen" },
      // In Label order, the duplicate dropped.
      labels: [{ id: "frontend" }, { id: "bug" }],
    });
  });
});

describe("createTask validation", () => {
  /** A refusal naming the one field at fault, with the message shown under it. */
  function refused(field: string, message: string) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: { [field]: message },
    };
  }

  async function boardIsEmpty() {
    const { statuses } = await board.getBoard();
    expect(statuses.flatMap(({ tasks }) => tasks)).toEqual([]);
  }

  test("accepts a 120-character title and refuses 121", async () => {
    const guest = await givenGuest();
    const longest = "t".repeat(120);

    expect(await board.createTask(guest, { title: longest })).toMatchObject({ ok: true });
    expect(await board.createTask(guest, { title: `${longest}t` })).toEqual(
      refused("title", "Keep the title to 120 characters or fewer."),
    );
    const { statuses } = await board.getBoard();
    expect(titlesIn(statuses, "TODO")).toEqual([longest]);
  });

  test.each(["", "   ", "\n\t "])("refuses a blank title (%j)", async (title) => {
    const guest = await givenGuest();

    expect(await board.createTask(guest, { title })).toEqual(
      refused("title", "Enter a title."),
    );
    await boardIsEmpty();
  });

  test("accepts a 2,000-character description and refuses 2,001", async () => {
    const guest = await givenGuest();
    const longest = "d".repeat(2000);

    const accepted = await board.createTask(guest, { title: "Long", description: longest });
    expect(
      await board.createTask(guest, { title: "Too long", description: `${longest}d` }),
    ).toEqual(refused("description", "Keep the description to 2,000 characters or fewer."));
    if (!accepted.ok) throw new Error(accepted.error);
    expect((await board.getTask(accepted.taskId))?.description).toBe(longest);
    const { statuses } = await board.getBoard();
    expect(titlesIn(statuses, "TODO")).toEqual(["Long"]);
  });

  test.each([
    ["title", { title: "a\0b" }],
    ["description", { title: "Fine", description: "a\0b" }],
  ])("refuses a NUL byte in the %s, which Postgres can't store", async (field, input) => {
    const guest = await givenGuest();

    expect(await board.createTask(guest, input)).toEqual(
      refused(field, "This contains a character that can't be saved."),
    );
    await boardIsEmpty();
  });

  test.each([
    ["status", { status: "BACKLOG" }, "Choose a Status from the list."],
    ["priority", { priority: "CRITICAL" }, "Choose a Priority from the list."],
    ["assigneeId", { assigneeId: "not-a-uuid" }, "Choose a Team Member from the list."],
    ["labelIds", { labelIds: ["NOT A LABEL"] }, "Choose Labels from the list."],
  ])("refuses an unknown %s at the Zod boundary", async (field, fields, message) => {
    const guest = await givenGuest();

    expect(await board.createTask(guest, { title: "Fine", ...fields })).toEqual(
      refused(field, message),
    );
    await boardIsEmpty();
  });

  test("refuses an Assignee who isn't on the Team Member roster", async () => {
    const guest = await givenGuest();

    expect(
      await board.createTask(guest, {
        title: "Fine",
        assigneeId: "00000000-0000-7000-8000-000000000001",
      }),
    ).toEqual(refused("assigneeId", "Choose a Team Member from the list."));
    await boardIsEmpty();
  });

  test("refuses a well-formed Label outside the fixed set", async () => {
    const guest = await givenGuest();
    await givenLabels();

    expect(
      await board.createTask(guest, { title: "Fine", labelIds: ["bug", "made-up"] }),
    ).toEqual(refused("labelIds", "Choose Labels from the list."));
    await boardIsEmpty();
  });

  test("names every field at fault at once", async () => {
    const guest = await givenGuest();

    const result = await board.createTask(guest, { title: " ", priority: "CRITICAL" });

    expect(result).toEqual({
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: { title: "Enter a title.", priority: "Choose a Priority from the list." },
    });
  });

  test("refuses input that isn't a Task at all", async () => {
    const guest = await givenGuest();

    expect(await board.createTask(guest, null)).toEqual({ ok: false, error: "Invalid input." });
    expect(await board.createTask(guest, {})).toEqual(refused("title", "Enter a title."));
  });
});
