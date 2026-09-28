export function mmss(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
export const pad2 = (n) => String(n).padStart(2, "0");
export function shortDate(ts) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}.${pad2(d.getDate())}`;
}
export function longDate(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
export function durationLabel(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m ? `${m}분 ${pad2(s)}초` : `${s}초`;
}
