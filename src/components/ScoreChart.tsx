import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { CATEGORY_KEYS } from "../../shared/schemas";
import { CATEGORY_LABEL } from "../../shared/labels";
import type { CategoryScores } from "../types/interview";

/** Radar of the six categories, optionally overlaid with the previous interview. */
export function ScoreChart({ scores, previous }: { scores: CategoryScores; previous?: CategoryScores | null }) {
  const data = CATEGORY_KEYS.map((k) => ({ category: CATEGORY_LABEL[k], current: scores[k], previous: previous?.[k] ?? 0 }));
  return (
    <div className="h-[280px] w-full sm:h-[320px]" role="img" aria-label={`Category scores: ${data.map((d) => `${d.category} ${d.current}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="category" tick={{ fill: "#a1a1ad", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {previous && <Radar dataKey="previous" stroke="#6b6b78" strokeDasharray="4 4" fill="transparent" isAnimationActive />}
          <Radar dataKey="current" stroke="#8b7cf6" strokeWidth={2} fill="#8b7cf6" fillOpacity={0.22} animationDuration={1200} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
