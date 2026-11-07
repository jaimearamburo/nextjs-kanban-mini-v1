import { z } from "zod";

/** The Ably event name every Board change is published under. */
export const CHANGE_EVENT = "task.changed";

/**
 * A change event as a client receives it. Only the origin matters to a
 * client (to skip its own); anything malformed is ignored.
 */
export const receivedChange = z.object({ origin: z.string().nullable() });
