/**
 * The interview panel (다대일 면접). Fictional interviewers — the AI speaks
 * through whichever seat fits the kind of question being asked.
 */
import type { QuestionType } from "../../shared/schemas";

export type Seat = "left" | "center" | "right";

export interface Look {
  suit: string;
  shirt: string;
  tie: string | null;
  skin: string;
  hair: string;
  hairStyle: "short" | "side" | "bob" | "neat";
  glasses: boolean;
}

export interface PanelMember {
  seat: Seat;
  name: string;
  title: string;
  /** Role shown on the name plate. */
  role: string;
  look: Look;
  voice: { pitch: number; rate: number; index: number };
}

export function departmentFor(position: string): string {
  const p = position.toLowerCase();
  if (/\bai\b|ml|data|데이터|인공지능/.test(p)) return "AI연구소";
  if (/front|back|개발|engineer|developer|엔지니어|devops|ios|android/.test(p)) return "개발팀";
  if (/product|pm|기획/.test(p)) return "서비스기획팀";
  if (/design|디자인|ux/.test(p)) return "디자인팀";
  if (/market|마케팅|마케터|growth|brand/.test(p)) return "마케팅팀";
  return "현업부서";
}

export function buildPanel(position: string): Record<Seat, PanelMember> {
  return {
    left: {
      seat: "left",
      name: "이서연",
      title: "책임",
      role: "인사팀",
      look: { suit: "#3f4452", shirt: "#f4f1ec", tie: null, skin: "#f1d2b8", hair: "#2a211d", hairStyle: "bob", glasses: false },
      voice: { pitch: 1.2, rate: 1.03, index: 1 },
    },
    center: {
      seat: "center",
      name: "김도윤",
      title: "팀장",
      role: "면접위원장",
      look: { suit: "#1f2b45", shirt: "#ffffff", tie: "#7d2a33", skin: "#e9c6a6", hair: "#1c1a19", hairStyle: "neat", glasses: false },
      voice: { pitch: 0.85, rate: 0.98, index: 0 },
    },
    right: {
      seat: "right",
      name: "박준호",
      title: "선임",
      role: departmentFor(position),
      look: { suit: "#4a4f58", shirt: "#e8eef6", tie: null, skin: "#efcfb2", hair: "#241e1a", hairStyle: "side", glasses: true },
      voice: { pitch: 1.0, rate: 1.06, index: 2 },
    },
  };
}

/** Which interviewer asks a given question — like a real panel taking turns. */
export function seatFor(type: QuestionType, isFollowUp: boolean): Seat {
  if (type === "technical") return "right";
  if (isFollowUp) return type === "deep_dive" ? "right" : "center";
  if (type === "reflection" || type === "motivation") return "left";
  return "center";
}

/** Stable 4-digit applicant number (지원번호) derived from the interview id. */
export function applicantNumber(id: string): string {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return String(1000 + (h % 9000));
}
