import { getCurrentGuest } from "@/lib/guests";
import { issueBoardToken } from "@/lib/realtime/server";

/**
 * Issues the visitor's Guest a short-lived Ably token request: the Guest id
 * is the client id, and it may only subscribe to this environment's Board
 * channel. Signed with the API key, which never reaches the client.
 */
export async function GET() {
  const guest = await getCurrentGuest();
  if (!guest) return Response.json({ error: "No Guest yet." }, { status: 401 });
  const token = await issueBoardToken(guest.id);
  if (!token) return Response.json({ error: "Real-time sync is off." }, { status: 503 });
  return Response.json(token, { headers: { "Cache-Control": "no-store" } });
}
