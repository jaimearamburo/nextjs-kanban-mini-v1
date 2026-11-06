import { z } from "zod";
import { PRIORITIES } from "./domain";

// Shared Zod schemas for every Board write. The Board module parses with
// them at its boundary; the client can reuse them for form errors.

export const taskId = z.uuid();

export const priority = z.enum(PRIORITIES);

export const setPriorityInput = z.object({ taskId, priority });
