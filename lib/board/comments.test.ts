import { beforeEach, describe, expect, test } from "vitest";
import { wipeDatabase } from "@/lib/db/reset";
import { testDb } from "@/test/database";
import { createBoard } from "./board";

const board = createBoard(testDb);

beforeEach(async () => {
  await wipeDatabase(testDb);
});

// Arrange-only fixtures: the Board module has no way to create Tasks or
// seeded Comments. Assertions go through the Board module only.
function givenTask({ archived = false }: { archived?: boolean } = {}) {
  return testDb.task.create({
    data: { title: "A Task", rank: "a0", archivedAt: archived ? new Date() : null },
  });
}

function givenGuest(name = "Brave Fox") {
  return testDb.guest.create({ data: { name, color: "violet" } });
}

const UNKNOWN_ID = "00000000-0000-7000-8000-000000000001";

function bodies(comments: { body: string }[]) {
  return comments.map((comment) => comment.body);
}

describe("addComment", () => {
  test("adds a Comment that reads back with its Guest author", async () => {
    const task = await givenTask();
    const guest = await givenGuest("Curious Otter");

    const result = await board.addComment(guest, { taskId: task.id, body: "Looks good" });

    expect(result).toEqual({ ok: true });
    const comments = await board.listComments(task.id);
    expect(bodies(comments)).toEqual(["Looks good"]);
    expect(comments[0].author).toEqual({ id: guest.id, name: "Curious Otter", color: "violet" });
    expect(comments[0].createdAt).toBeInstanceOf(Date);
  });

  test("trims the body", async () => {
    const task = await givenTask();
    const guest = await givenGuest();

    await board.addComment(guest, { taskId: task.id, body: "  spaced  " });

    expect(bodies(await board.listComments(task.id))).toEqual(["spaced"]);
  });

  test("accepts exactly 1,000 characters and rejects 1,001", async () => {
    const task = await givenTask();
    const guest = await givenGuest();
    const longest = "x".repeat(1000);

    expect(await board.addComment(guest, { taskId: task.id, body: longest })).toEqual({ ok: true });
    expect(await board.addComment(guest, { taskId: task.id, body: `${longest}x` })).toEqual({
      ok: false,
      error: "Invalid input.",
    });
    expect(bodies(await board.listComments(task.id))).toEqual([longest]);
  });

  test.each(["", "   ", "\n\t "])("rejects a blank body (%j)", async (body) => {
    const task = await givenTask();
    const guest = await givenGuest();

    expect(await board.addComment(guest, { taskId: task.id, body })).toEqual({
      ok: false,
      error: "Invalid input.",
    });
    expect(await board.listComments(task.id)).toEqual([]);
  });

  test("rejects a NUL byte, which Postgres can't store", async () => {
    const task = await givenTask();
    const guest = await givenGuest();

    expect(await board.addComment(guest, { taskId: task.id, body: "a\0b" })).toEqual({
      ok: false,
      error: "Invalid input.",
    });
    expect(await board.listComments(task.id)).toEqual([]);
  });

  test("refuses a Task that is unknown or Archived", async () => {
    const archived = await givenTask({ archived: true });
    const guest = await givenGuest();
    const gone = { ok: false, error: "This Task no longer exists." };

    expect(await board.addComment(guest, { taskId: UNKNOWN_ID, body: "Hi" })).toEqual(gone);
    expect(await board.addComment(guest, { taskId: archived.id, body: "Hi" })).toEqual(gone);
  });
});

describe("archiveComment", () => {
  async function givenComment(body = "Remove me") {
    const task = await givenTask();
    const author = await givenGuest("The Author");
    await board.addComment(author, { taskId: task.id, body });
    const [comment] = await board.listComments(task.id);
    return { task, comment };
  }

  test("any Guest can archive any Comment: it leaves reads but the row is kept", async () => {
    const { task, comment } = await givenComment();
    const otherGuest = await givenGuest("Someone Else");

    const result = await board.archiveComment(otherGuest, { commentId: comment.id });

    expect(result).toEqual({ ok: true });
    expect(await board.listComments(task.id)).toEqual([]);
    // ADR-0002 is about the row itself, which no Board read can show.
    const row = await testDb.comment.findUniqueOrThrow({ where: { id: comment.id } });
    expect(row.archivedAt).toBeInstanceOf(Date);
  });

  test("archiving twice succeeds and keeps the first archive time", async () => {
    const { comment } = await givenComment();
    const guest = await givenGuest();
    await board.archiveComment(guest, { commentId: comment.id });
    const { archivedAt } = await testDb.comment.findUniqueOrThrow({ where: { id: comment.id } });

    const again = await board.archiveComment(guest, { commentId: comment.id });

    expect(again).toEqual({ ok: true });
    const row = await testDb.comment.findUniqueOrThrow({ where: { id: comment.id } });
    expect(row.archivedAt).toEqual(archivedAt);
  });

  test("only archives the Comment named", async () => {
    const { task, comment } = await givenComment("Remove me");
    const guest = await givenGuest();
    await board.addComment(guest, { taskId: task.id, body: "Keep me" });

    await board.archiveComment(guest, { commentId: comment.id });

    expect(bodies(await board.listComments(task.id))).toEqual(["Keep me"]);
  });

  test("rejects a malformed id", async () => {
    const guest = await givenGuest();

    expect(await board.archiveComment(guest, { commentId: "nope" })).toEqual({
      ok: false,
      error: "Invalid input.",
    });
  });
});

describe("listComments", () => {
  test("lists oldest first, naming a Team Member author on seeded Comments", async () => {
    const task = await givenTask();
    const guest = await givenGuest();
    const member = await testDb.teamMember.create({
      data: { name: "Maya Chen", color: "teal", position: 1 },
    });
    await testDb.comment.create({
      data: {
        taskId: task.id,
        body: "Seeded",
        authorTeamMemberId: member.id,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    });
    await board.addComment(guest, { taskId: task.id, body: "Newer" });

    const comments = await board.listComments(task.id);

    expect(bodies(comments)).toEqual(["Seeded", "Newer"]);
    expect(comments[0].author).toEqual({ id: member.id, name: "Maya Chen", color: "teal" });
  });

  test("is empty for a malformed id", async () => {
    expect(await board.listComments("not-a-uuid")).toEqual([]);
  });
});
