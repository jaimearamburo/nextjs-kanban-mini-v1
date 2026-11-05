# Last-write-wins per field, final values instead of relative instructions, no locks

Concurrent edits by Guests are resolved last-write-wins for each field, which is the industry norm (Jira, Linear). There are no row locks and no version checks. What prevents real races is that every change carries the **final value**, such as "set priority to High", never a relative instruction such as "cycle priority". With a relative "cycle" instruction, two simultaneous clicks would skip a level. Reordering sends the neighbouring Task ids, the server works out the Rank, and ties are broken by id.

## Considered options

- **Row locks:** rejected. They need interactive transactions, which are awkward with serverless Prisma behind a connection pooler.
- **Version checks (rejecting stale saves):** rejected. They break fast repeated optimistic clicks and add complexity that doesn't show off the framework.

## Consequences

Title and description edits can silently replace someone else's text. To make that visible, a "changed elsewhere" notice appears while a Guest is editing a field that another Guest has just saved.
