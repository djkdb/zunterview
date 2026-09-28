export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function shortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}.${pad2(d.getDate())}`;
}

export function longDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function durationLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}분 ${pad2(s)}초` : `${s}초`;
}
