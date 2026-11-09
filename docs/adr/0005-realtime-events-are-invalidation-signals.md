# Real-time events are invalidation signals, not data

**Status: superseded.** Live sync was removed in #33, along with Ably. It added a third-party service, a token endpoint and a change event on every write, which was more than a demo Board with few simultaneous Guests needed. A Guest's own changes still show immediately through optimistic updates and `updateTag`; changes by other Guests appear the next time that browser loads or navigates to fresh data. The rest of this file is kept as the record of the decision.

Changes reach other browsers as small "Task X changed" events on an Ably Board channel, and each browser answers with `startTransition(() => router.refresh())`. That is a soft refresh: it keeps client state, scroll position and the open modal, and shows no Suspense fallbacks. Events carry identifiers only (the Task, the field, the acting Guest and the tab it came from), never data. The server stays the only source of truth, and there is no second client-side model to keep in sync.

## How a change travels

- **The Board module publishes.** Its "publish change" port is called once after every successful write commits; a failed write publishes nothing. It is Ably in the app and an in-memory fake in tests, so "exactly one event per successful write" is checked by integration tests, not left to each Server Action.
- **After the response.** The Ably adapter sends the event in `after()`, once the Server Action's `updateTag` calls have taken effect. A browser that refreshes on hearing the event therefore never reads the cache from before the write.
- **A failed publish is logged, not reported to the Guest.** The write has already committed, so it isn't turned into a failure. Other browsers miss that one change until their next refresh.

## How a browser responds

- **It skips events from its own tab.** Each tab sends a random origin id with its writes, and the event echoes it. Skipping by Guest instead would stop two tabs of the same Guest from syncing.
- **It combines bursts.** The first event schedules one refresh shortly afterwards; events arriving in the meantime share it.
- **It holds refreshes while a drag is in progress**, then runs one when the drag ends if any were held. A mouse drag counts only once it has moved, so a plain click on a card holds nothing back.
- **It catches up after a reconnect that lost the channel's continuity**, with one refresh, because events may have been missed.

## Considered options

- **Patching client state from event payloads:** rejected. It duplicates the read model on the client.
- **Server-side `refresh()`:** rejected. It only reaches the browser that called the action.
- **The Server Action publishing after `updateTag`:** rejected in favour of the Board module's port. Each new action would have had to remember to publish, and "one event per successful write" couldn't be tested at the module boundary.

## Consequences

The provider sits behind the port on the server, but the client subscription, the token Route Handler and the channel naming are Ably-specific (ADR-0006). Switching provider means rewriting those, not the Board module or the refresh rules.
