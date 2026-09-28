import { useEffect, useState } from "react";
/** Current time, re-rendering every `intervalMs` while `active`. */
export function useNow(active, intervalMs = 250) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!active)
            return;
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [active, intervalMs]);
    return now;
}
/** Seconds elapsed since `startedAt` (0 when not started). */
export function useElapsed(startedAt, running) {
    const now = useNow(running && startedAt !== null);
    return startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
}
