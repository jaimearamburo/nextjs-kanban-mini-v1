# The Guest cookie is an unsigned Guest id

A Guest is a label, not an account: it owns nothing private, and every Guest can already change any Task and delete any Comment (ADR-0002). So the Guest cookie holds only the Guest's id, httpOnly and long-lived, and isn't signed. Zod checks that the cookie is a UUID, and the Guest is then read from the database. A missing or malformed cookie, or one naming no Guest, gets a new Guest.

## Consequences

Anyone who copies another browser's Guest id into their own cookie acts as that Guest: their Comments are attributed to it. Ids are random UUIDs that are never shown in the UI, so this takes deliberate effort and gains nothing that being your own Guest doesn't already allow. In issue #3, a "tampered" cookie means a malformed or unknown id, not a real id copied from someone else.

## Considered options

- **Signed cookie (an HMAC with a `GUEST_COOKIE_SECRET`):** rejected. It would detect a copied or altered id, but needs a new secret in every environment (local, previews, CI, production) and a plan for rotating it, to protect an identity that guards nothing.
- **Storing the name and colour in the cookie too:** rejected. A client could then rename itself at will, and the database would no longer be the single source of truth for the Guest.
