import { useState } from "react";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { API_BASE_URL } from "../config/env";

interface Day {
  day: string;
  aiCalls: number;
  aiFailures: number;
  costCents: number;
  ttsChars: number;
  ttsCalls: number;
  limited: number;
  events: Record<string, number>;
  feedback: { up: number; down: number };
  visitors: number;
}
interface Metrics {
  limits: { budgetUsd: number; aiCallsPerIp: number; ttsCharsPerIp: number };
  promptVersion: string;
  model: string;
  days: Day[];
}

const TOKEN_KEY = "interview-ai:admin-token";
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "-");

/** Operator view of /api/admin/metrics (ADMIN_TOKEN). The token stays in this tab only. */
export function AdminPage({ onHome }: { onHome: () => void }) {
  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/metrics`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) return setError("서버에 ADMIN_TOKEN이 설정되지 않았습니다.");
      if (res.status === 401) return setError("토큰이 맞지 않습니다.");
      if (!res.ok) return setError(`불러오지 못했습니다 (${res.status}).`);
      setData((await res.json()) as Metrics);
      try {
        sessionStorage.setItem(TOKEN_KEY, token);
      } catch {
        /* fine */
      }
    } catch {
      setError("서버에 연결하지 못했습니다.");
    }
  };

  const columns: [string, (d: Day) => string | number][] = [
    ["날짜", (d) => d.day.slice(5)],
    ["방문", (d) => d.events.landing_viewed ?? 0],
    ["접수 시작", (d) => d.events.setup_started ?? 0],
    ["면접 시작", (d) => d.events.interview_started ?? 0],
    ["완료", (d) => d.events.interview_completed ?? 0],
    ["완료율", (d) => pct(d.events.interview_completed ?? 0, d.events.interview_started ?? 0)],
    ["다시 답하기", (d) => d.events.reanswer ?? 0],
    ["도움 됨/아쉬움", (d) => `${d.feedback.up}/${d.feedback.down}`],
    ["AI 호출", (d) => d.aiCalls],
    ["AI 실패", (d) => d.aiFailures],
    ["AI 비용($)", (d) => (d.costCents / 100).toFixed(2)],
    ["음성 글자", (d) => d.ttsChars.toLocaleString()],
    ["한도 초과", (d) => d.limited],
  ];

  return (
    <div className="min-h-dvh pb-16">
      <TopBar onHome={onHome} />
      <main className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6">
        <h1 className="text-2xl font-extrabold text-navy">운영 지표</h1>
        <form
          className="mt-4 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <label htmlFor="admin-token" className="sr-only">
            관리자 토큰
          </label>
          <input
            id="admin-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ADMIN_TOKEN"
            className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-3 text-[14px] focus:border-accent focus:outline-none"
          />
          <Button size="sm" variant="primary" type="submit" disabled={!token}>
            불러오기
          </Button>
        </form>
        {error && <p className="mt-3 text-[13px] text-low">{error}</p>}
        {data && (
          <>
            <p className="mt-4 text-[13px] text-muted">
              모델 {data.model}, 프롬프트 {data.promptVersion}. 하루 AI 예산 ${data.limits.budgetUsd}, 방문자당 AI 호출 {data.limits.aiCallsPerIp}회, 음성 {data.limits.ttsCharsPerIp.toLocaleString()}자. 방문자 수는 AI나 음성을 쓴 사람만 셉니다.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-[13px] tabular-nums">
                <thead>
                  <tr className="bg-surface-2 text-left text-faint">
                    {columns.map(([h]) => (
                      <th key={h} className="border border-line px-2 py-1.5 font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((d) => (
                    <tr key={d.day}>
                      {columns.map(([h, f]) => (
                        <td key={h} className="border border-line px-2 py-1.5 whitespace-nowrap">
                          {f(d)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
