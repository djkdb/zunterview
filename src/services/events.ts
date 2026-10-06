/**
 * Anonymous usage counts for the operator (which steps people reach, how sheets are rated).
 * Never sends answers, documents, names or anything typed, except a feedback comment the
 * candidate chooses to write. Honors the browser's Do Not Track setting; never throws.
 */
import type { EventName } from "../../shared/schemas";
import { API_BASE_URL } from "../config/env";

export type EventProps = Record<string, string | number | boolean>;

const disabled = () => {
  try {
    return navigator.doNotTrack === "1" || new URLSearchParams(window.location.search).has("notrack");
  } catch {
    return true;
  }
};

export function track(name: EventName, props: EventProps = {}): void {
  if (disabled()) return;
  try {
    void fetch(`${API_BASE_URL}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, props }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* counting must never break the app */
  }
}
