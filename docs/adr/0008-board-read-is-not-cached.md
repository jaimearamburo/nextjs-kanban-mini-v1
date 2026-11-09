# The Board read is not cached, and writes refill the Task's cache entry

The Board reads the database on every request, and every write re-reads its Task straight after `updateTag`. With `"use cache"` and `updateTag` alone, a Guest could see the old Board or Task after a successful save. In Next 16.4.4, `updateTag` records a tag's expiry twice, and `FileSystemCache.revalidateTag` overwrites the performance-clock value with `Date.now()`. The cache compares against the performance clock, so when `Date.now()` runs ahead (2s or more on WSL2) the expiry looks like it is in the future and the old entry stays valid until that clock catches up.

The Task stays cached because prefetching it is what makes a Task open instantly from its card. The re-read happens inside the Server Action, where Next discards the old entry and stores the new one. The Board has one entry per filter, so it can't be refilled the same way.

## Consequences

Every Board render costs a database read, which is acceptable for one small shared Board. `"use cache"` can return for the Board, and the re-read can go, if Next stops mixing the two clocks.
