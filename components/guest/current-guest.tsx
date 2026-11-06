import { getCurrentGuest } from "@/lib/guests";
import { GuestIdentity } from "./guest-identity";
import { StartGuestSession } from "./start-guest-session";

/** Reads the Guest cookie, so it must render inside Suspense. */
export async function CurrentGuest() {
  const guest = await getCurrentGuest();
  if (!guest) return <StartGuestSession />;
  return <GuestIdentity key={guest.id} guest={guest} />;
}
