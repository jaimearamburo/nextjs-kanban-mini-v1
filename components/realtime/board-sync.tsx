import { getCurrentGuest } from "@/lib/guests";
import { getRealtime } from "@/lib/realtime/server";
import { BoardSyncClient } from "./board-sync-client";

/**
 * Live Board sync for the visitor's Guest. It connects once the visitor has
 * a Guest (tokens are issued to Guests), and reconnects for a new identity.
 * Reads the Guest cookie, so it must render inside Suspense.
 */
export async function BoardSync() {
  const guest = await getCurrentGuest();
  const realtime = getRealtime();
  if (!guest || !realtime) return null;
  return <BoardSyncClient key={guest.id} channel={realtime.channel} />;
}
