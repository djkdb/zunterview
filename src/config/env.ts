/** Base URL of the API layer (empty = same origin, proxied by Vite in dev). */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
