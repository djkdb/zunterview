export const createId = (prefix = "id") => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const delay = (ms) => new Promise((r) => setTimeout(r, ms));
