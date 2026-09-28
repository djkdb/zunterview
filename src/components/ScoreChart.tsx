import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { CATEGORY_KEYS } from "../../shared/schemas";
import { CATEGORY_KO } from "../config/labelsKo";
import type { CategoryScores } from "../types/interview";

/** Radar of the six categories, optionally overlaid with the previous interview. */
export function ScoreChart({ scores, previous }: { scores: CategoryScores; previous?: CategoryScores | null }) {
  const data = CATEGORY_KEYS.map((k) => ({ category: CATEGORY_KO[k], current: scores[k], previous: previous?.[k] ?? 0 }));
  return (
    <div className="h-[250px] w-full sm:h-[280px]" role="img" aria-label={`항목별 점수: ${data.map((d) => `${d.category} ${d.current}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#d9dee5" />
          <PolarAngleAxis dataKey="category" tick={{ fill: "#4b5563", fontSize: 12, fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {previous && <Radar dataKey="previous" stroke="#9aa0ab" strokeDasharray="4 4" fill="transparent" />}
          <Radar dataKey="current" stroke="#1b3a6b" strokeWidth={2} fill="#1b3a6b" fillOpacity={0.16} animationDuration={1100} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
