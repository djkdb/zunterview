import { Area, AreaChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { grade } from "../config/labelsKo";
import type { InterviewSummary } from "../types/interview";
import { shortDate } from "../utils/format";

const NAVY = "#1b3a6b";
const GRID = "#e3e7ed";
const INK_MUTED = "#7b8494";

interface Point {
  n: number;
  label: string;
  score: number;
  title: string;
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-[12px] shadow-md">
      <p className="text-faint">
        {p.n}회차 · {p.label}
      </p>
      <p className="mt-0.5 font-semibold text-ink">{p.title}</p>
      <p className="mt-0.5 text-ink">
        <b className="font-mono text-[14px]">{p.score}</b>점 · {grade(p.score)}등급
      </p>
    </div>
  );
}

/** Overall score across attempts (oldest → newest). Single series, so the title names it — no legend. */
export function ScoreTrend({ history }: { history: InterviewSummary[] }) {
  const data: Point[] = [...history]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-20)
    .map((h, i) => ({ n: i + 1, label: shortDate(h.createdAt), score: h.score, title: h.company ? `${h.company} · ${h.position}` : h.position }));
  const last = data[data.length - 1];
  const first = data[0];
  const delta = last.score - first.score;

  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5" aria-label="점수 추이">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-bold text-ink">종합 점수 추이</h2>
          <p className="text-[12px] text-faint">최근 {data.length}회 · 질문 구성이 매번 달라 참고용 추세입니다</p>
        </div>
        <p className="text-[13px] text-muted">
          첫 기록 대비{" "}
          <b className={delta > 0 ? "text-good" : delta < 0 ? "text-warn" : "text-muted"}>
            {delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${-delta}` : "변화 없음"}
          </b>
        </p>
      </div>
      <div className="h-[180px] w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 22, right: 24, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: INK_MUTED, fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} tick={{ fill: INK_MUTED, fontSize: 11 }} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#9aa0ab", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="score"
              stroke={NAVY}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={NAVY}
              fillOpacity={0.1}
              dot={{ r: 4, fill: NAVY, fillOpacity: 1, stroke: "#ffffff", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: NAVY, fillOpacity: 1, stroke: "#ffffff", strokeWidth: 2 }}
              isAnimationActive
              animationDuration={700}
            >
              {/* label only the latest attempt; the tooltip and table carry the rest */}
              <LabelList
                dataKey="score"
                content={(props) => {
                  const { x, y, index } = props as { x: number; y: number; index: number };
                  if (index !== data.length - 1) return null;
                  return (
                    <text x={x} y={y - 10} textAnchor="middle" fontSize={12} fontWeight={700} fill="#111827">
                      {last.score}
                    </text>
                  );
                }}
              />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>회차별 종합 점수</caption>
        <thead>
          <tr>
            <th>회차</th>
            <th>날짜</th>
            <th>면접</th>
            <th>점수</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.n}>
              <td>{p.n}</td>
              <td>{p.label}</td>
              <td>{p.title}</td>
              <td>{p.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
