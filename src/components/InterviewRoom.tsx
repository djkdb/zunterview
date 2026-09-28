/**
 * A Korean company interview room, seen from the candidate's chair:
 * a long desk, a three-person panel with name plates, water bottles,
 * documents, a wall screen and a wall clock that shows the real time.
 *
 * The interviewer who asks the current question talks; while answers are
 * reviewed the whole panel looks down and writes on the evaluation sheet.
 */
import { memo } from "react";
import { useNow } from "../hooks/useTimer";
import type { PanelMember, Seat } from "../config/panel";

export type RoomMode = "idle" | "asking" | "listening" | "reviewing";

interface Props {
  panel: Record<Seat, PanelMember>;
  speaking: Seat | null;
  mode: RoomMode;
  /** 0-1: candidate is typing/speaking — the panel nods along. */
  activity?: number;
  roomLabel?: string;
  /** Company/institution the mock interview is modeled on (shown on the wall screen). */
  companyName?: string;
  /** "center" keeps the faces in view when the room is squeezed (e.g. while typing on a phone). */
  anchor?: "bottom" | "center";
  className?: string;
}

const SEAT_X: Record<Seat, number> = { left: 330, center: 600, right: 870 };
const DESK_Y = 372;

export function InterviewRoom({ panel, speaking, mode, activity = 0, roomLabel = "제2면접실", companyName, anchor = "bottom", className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 1200 520"
      preserveAspectRatio={anchor === "center" ? "xMidYMid slice" : "xMidYMax slice"}
      className={`block h-full w-full ${className}`}
      role="img"
      aria-label={`면접실. 면접관 3명이 책상에 앉아 있습니다. ${
        mode === "asking" && speaking ? `${panel[speaking].name} ${panel[speaking].title}이 질문하고 있습니다.` : mode === "reviewing" ? "면접관들이 답변을 검토하고 있습니다." : ""
      }`}
    >
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef1f4" />
          <stop offset="1" stopColor="#d7dce3" />
        </linearGradient>
        <linearGradient id="deskTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#434a54" />
          <stop offset="1" stopColor="#30353c" />
        </linearGradient>
        <linearGradient id="deskFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2e6eb" />
          <stop offset="1" stopColor="#c9cfd7" />
        </linearGradient>
        <linearGradient id="window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe9f2" />
          <stop offset="1" stopColor="#f3f6f8" />
        </linearGradient>
        <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b2740" />
          <stop offset="1" stopColor="#0f1829" />
        </linearGradient>
        <radialGradient id="lamp" cx="0.5" cy="0" r="0.8">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── wall ─────────────────────────────────────────── */}
      <rect width="1200" height="520" fill="url(#wall)" />
      <rect width="1200" height="260" fill="url(#lamp)" />
      {[150, 450, 750, 1050].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2={DESK_Y} stroke="#000" strokeOpacity="0.035" strokeWidth="2" />
      ))}

      {/* window with blinds */}
      <g>
        <rect x="46" y="44" width="190" height="250" rx="4" fill="#c3c9d1" />
        <rect x="54" y="52" width="174" height="234" fill="url(#window)" />
        {Array.from({ length: 16 }).map((_, i) => (
          <rect key={i} x="54" y={56 + i * 14.4} width="174" height="7" fill="#f7f9fb" opacity="0.92" />
        ))}
        <line x1="141" y1="52" x2="141" y2="286" stroke="#aeb6c1" strokeWidth="1.5" />
      </g>

      {/* wall screen with the "company" sign */}
      <g>
        <rect x="468" y="36" width="264" height="84" rx="6" fill="#2a2f39" />
        <rect x="474" y="42" width="252" height="72" rx="3" fill="url(#screen)" />
        <text x="600" y="76" textAnchor="middle" fill="#e9edf5" fontSize="22" fontFamily="JetBrains Mono, monospace" letterSpacing="3">
          INTERVIEW<tspan fill="#7fa6e0">//</tspan>AI
        </text>
        <text x="600" y="100" textAnchor="middle" fill="#9fb0c9" fontSize="13" fontFamily="Pretendard Variable, sans-serif">
          {companyName ? `${companyName} 모의면접` : "모의면접"} · {roomLabel}
        </text>

      </g>

      <WallClock />

      {/* plant */}
      <g transform="translate(1128 372)">
        {[-62, -38, -16, 4, 24, 46, 66, -50, 34].map((a, i) => (
          <g key={i} transform={`translate(0 -44) rotate(${a})`}>
            <path d={`M0 0 C -14 -${40 + (i % 3) * 14} -10 -${86 + (i % 3) * 18} 0 -${110 + (i % 3) * 22} C 10 -${86 + (i % 3) * 18} 14 -${40 + (i % 3) * 14} 0 0 Z`} fill={i % 2 ? "#5b7a4f" : "#4a6841"} />
            <path d={`M0 0 L0 -${104 + (i % 3) * 22}`} stroke="#3c5535" strokeWidth="1.2" />
          </g>
        ))}
        <path d="M-28 -46 L28 -46 L22 0 L-22 0 Z" fill="#5f6670" />
        <rect x="-30" y="-50" width="60" height="7" rx="2" fill="#50565f" />
      </g>

      {/* ── panel (behind the desk) ─────────────────────────── */}
      {(["left", "center", "right"] as Seat[]).map((seat, i) => (
        <InterviewerBody
          key={seat}
          x={SEAT_X[seat]}
          member={panel[seat]}
          talking={mode === "asking" && speaking === seat}
          reviewing={mode === "reviewing"}
          nodding={mode === "listening" && (activity > 0 ? seat !== "right" || i % 2 === 0 : seat === "center")}
          nodDelay={i * 0.9}
        />
      ))}

      {/* ── desk ─────────────────────────────────────────── */}
      <path d={`M36 ${DESK_Y} L1164 ${DESK_Y} L1196 ${DESK_Y + 32} L4 ${DESK_Y + 32} Z`} fill="url(#deskTop)" />
      <line x1="4" y1={DESK_Y + 32} x2="1196" y2={DESK_Y + 32} stroke="#1f2328" strokeWidth="2" />

      {/* documents, bottles, applicant files */}
      <g transform={`translate(470 ${DESK_Y})`}>
        <path d="M-26 6 L22 6 L26 24 L-30 24 Z" fill="#ffffff" />
        <path d="M-24 3 L24 3 L28 21 L-28 21 Z" fill="#f5f7fa" stroke="#cfd5dd" strokeWidth="0.8" />
        <rect x="-10" y="7" width="20" height="3" fill="#1b3a6b" opacity="0.5" />
      </g>
      {(["left", "center", "right"] as Seat[]).map((seat) => (
        <DeskItems key={seat} x={SEAT_X[seat]} writing={mode === "reviewing"} member={panel[seat]} />
      ))}

      {/* desk front panel + name plates */}
      <rect x="4" y={DESK_Y + 33} width="1192" height={520 - DESK_Y - 33} fill="url(#deskFront)" />
      <rect x="4" y={DESK_Y + 33} width="1192" height="6" fill="#000" opacity="0.06" />
      {/* table banner — visible at any crop since the scene is bottom-anchored */}
      <g transform={`translate(600 ${DESK_Y + 106})`}>
        <rect x="-190" y="0" width="380" height="30" rx="2" fill="#1f2b45" />
        <text x="0" y="20" textAnchor="middle" fontSize="14" fontWeight="700" fill="#eef1f4" letterSpacing="2" fontFamily="Pretendard Variable, sans-serif">
          {companyName ? `${companyName} 모의면접` : "INTERVIEW//AI 모의면접"} · {roomLabel}
        </text>
      </g>
      {(["left", "center", "right"] as Seat[]).map((seat) => (
        <NamePlate key={seat} x={SEAT_X[seat]} member={panel[seat]} active={mode === "asking" && speaking === seat} />
      ))}

      {/* speech bubble over the interviewer who is talking */}
      {mode === "asking" && speaking && (
        <g transform={`translate(${SEAT_X[speaking] + 44} ${DESK_Y - 262})`}>
          <path d="M0 0 h58 a10 10 0 0 1 10 10 v18 a10 10 0 0 1 -10 10 h-40 l-14 12 l2 -12 h-6 a10 10 0 0 1 -10 -10 v-18 a10 10 0 0 1 10 -10 z" fill="#ffffff" stroke="#1b3a6b" strokeOpacity="0.35" />
          {[0, 1, 2].map((d) => (
            <circle key={d} cx={18 + d * 14} cy="19" r="4" fill="#1b3a6b" className="iv-part" style={{ animation: `iv-dot 1s ease-in-out ${d * 0.15}s infinite` }} />
          ))}
        </g>
      )}
    </svg>
  );
}

/* ───────────────────────────── pieces ───────────────────────────── */

const WallClock = memo(function WallClock() {
  const now = useNow(true, 1000);
  const d = new Date(now);
  const m = d.getMinutes() + d.getSeconds() / 60;
  const h = (d.getHours() % 12) + m / 60;
  const hand = (deg: number, len: number, w: number, color: string) => {
    const r = ((deg - 90) * Math.PI) / 180;
    return <line x1="0" y1="0" x2={Math.cos(r) * len} y2={Math.sin(r) * len} stroke={color} strokeWidth={w} strokeLinecap="round" />;
  };
  return (
    <g transform="translate(1030 124)" aria-hidden>
      <circle r="38" fill="#2d3038" />
      <circle r="33" fill="#fbfcfd" />
      {Array.from({ length: 12 }).map((_, i) => {
        const r = (i * 30 * Math.PI) / 180;
        return <line key={i} x1={Math.sin(r) * 26} y1={-Math.cos(r) * 26} x2={Math.sin(r) * 30} y2={-Math.cos(r) * 30} stroke="#2d3038" strokeWidth={i % 3 === 0 ? 2.4 : 1.2} />;
      })}
      {hand(h * 30, 16, 3.5, "#2d3038")}
      {hand(m * 6, 24, 2.4, "#2d3038")}
      {hand(d.getSeconds() * 6, 27, 1, "#b3261e")}
      <circle r="2.5" fill="#2d3038" />
    </g>
  );
});

function Hair({ look, layer }: { look: PanelMember["look"]; layer: "back" | "front" }) {
  const c = look.hair;
  if (look.hairStyle === "bob") {
    return layer === "back" ? (
      <path d="M-40 -146 C-48 -196 -36 -230 0 -230 C36 -230 48 -196 40 -146 C33 -140 26 -146 26 -156 L26 -186 L-26 -186 L-26 -156 C-26 -146 -33 -140 -40 -146 Z" fill={c} />
    ) : (
      <path d="M-33 -186 C-34 -222 -12 -228 4 -226 C26 -224 36 -206 33 -186 C22 -200 6 -204 -10 -198 C-18 -195 -27 -192 -33 -186 Z" fill={c} />
    );
  }
  if (layer === "back") return null;
  if (look.hairStyle === "side") {
    return <path d="M-33 -182 C-36 -222 -10 -228 6 -226 C28 -224 36 -206 33 -184 C30 -198 22 -206 8 -204 C-6 -212 -24 -200 -33 -182 Z" fill={c} />;
  }
  if (look.hairStyle === "neat") {
    return <path d="M-32 -184 C-34 -220 -14 -226 2 -225 C24 -224 34 -210 32 -186 C29 -198 18 -205 -2 -205 C-14 -205 -26 -198 -32 -184 Z" fill={c} />;
  }
  return <path d="M-32 -186 C-32 -218 -14 -224 0 -224 C14 -224 32 -218 32 -186 C26 -202 12 -206 0 -206 C-12 -206 -26 -202 -32 -186 Z" fill={c} />;
}

function InterviewerBody({ x, member, talking, reviewing, nodding, nodDelay }: { x: number; member: PanelMember; talking: boolean; reviewing: boolean; nodding: boolean; nodDelay: number }) {
  const { look } = member;
  return (
    <g transform={`translate(${x} ${DESK_Y})`}>
      {/* chair */}
      <rect x="-68" y="-252" width="136" height="230" rx="22" fill="#2b2f37" />
      <rect x="-58" y="-242" width="116" height="60" rx="16" fill="#353a44" />
      {/* torso */}
      <path d="M-88 40 L-82 -84 Q-78 -122 -42 -130 L42 -130 Q78 -122 82 -84 L88 40 Z" fill={look.suit} />
      <path d="M-22 -130 L0 -76 L22 -130 Z" fill={look.shirt} />
      {look.tie ? (
        <>
          <path d="M-6 -124 L6 -124 L9 -86 L0 -72 L-9 -86 Z" fill={look.tie} />
          <rect x="-7" y="-130" width="14" height="8" rx="2" fill={look.tie} />
        </>
      ) : (
        <path d="M-12 -130 L0 -112 L12 -130" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="1.5" />
      )}
      <path d="M-22 -130 L-6 -76 L-34 -104 Z M22 -130 L6 -76 L34 -104 Z" fill="#000" opacity="0.12" />
      {/* neck */}
      <rect x="-12" y="-152" width="24" height="26" rx="6" fill={look.skin} />
      <rect x="-12" y="-138" width="24" height="10" fill="#000" opacity="0.08" />

      {/* head */}
      <g className={`iv-part ${reviewing ? "iv-look-down" : nodding ? "iv-nod" : ""}`} style={nodding ? { animationDelay: `${nodDelay}s` } : undefined}>
        <Hair look={look} layer="back" />
        <ellipse cx="-31" cy="-178" rx="5" ry="8" fill={look.skin} />
        <ellipse cx="31" cy="-178" rx="5" ry="8" fill={look.skin} />
        <ellipse cx="0" cy="-180" rx="31" ry="37" fill={look.skin} />
        <Hair look={look} layer="front" />
        {/* brows */}
        <path d={reviewing ? "M-18 -190 L-6 -189 M6 -189 L18 -190" : "M-18 -193 L-6 -195 M6 -195 L18 -193"} stroke="#2a211d" strokeWidth="2.6" strokeLinecap="round" />
        {/* eyes */}
        {reviewing ? (
          <path d="M-15 -180 Q-11 -177 -7 -180 M7 -180 Q11 -177 15 -180" stroke="#2a2a2a" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : (
          <g className="iv-part iv-blink" style={{ animationDelay: `${nodDelay * 1.7}s` }}>
            <ellipse cx="-11" cy="-180" rx="3.2" ry="3.6" fill="#2a2a2a" />
            <ellipse cx="11" cy="-180" rx="3.2" ry="3.6" fill="#2a2a2a" />
          </g>
        )}
        {look.glasses && (
          <g fill="none" stroke="#2f3136" strokeWidth="1.8">
            <rect x="-21" y="-188" width="17" height="14" rx="4" />
            <rect x="4" y="-188" width="17" height="14" rx="4" />
            <path d="M-4 -182 L4 -182" />
          </g>
        )}
        <path d="M0 -176 Q-3 -168 1 -166" stroke="#000" strokeOpacity="0.22" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {talking ? (
          <ellipse cx="0" cy="-157" rx="7" ry="4.5" fill="#7a3b33" className="iv-part iv-talk" />
        ) : (
          <path d="M-8 -159 Q0 -155 8 -159" stroke="#8a4b3f" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}
        <ellipse cx="-19" cy="-166" rx="5" ry="3" fill="#e08a7a" opacity="0.18" />
        <ellipse cx="19" cy="-166" rx="5" ry="3" fill="#e08a7a" opacity="0.18" />
      </g>
    </g>
  );
}

function DeskItems({ x, writing, member }: { x: number; writing: boolean; member: PanelMember }) {
  const { look } = member;
  return (
    <g transform={`translate(${x} ${DESK_Y})`}>
      {/* evaluation sheet */}
      <path d="M-46 4 L46 4 L52 28 L-52 28 Z" fill="#ffffff" stroke="#cfd5dd" strokeWidth="0.8" />
      {[10, 15, 20].map((y) => (
        <line key={y} x1={-36 - (y - 4) * 0.2} y1={y} x2={30 + (y - 4) * 0.2} y2={y} stroke="#9aa3b5" strokeWidth="1" opacity="0.6" />
      ))}
      {/* sleeves + hands */}
      <path d="M-80 -74 C-94 -34 -88 2 -70 14 L-38 18 L-46 -8 C-54 -28 -58 -50 -60 -74 Z" fill={look.suit} />
      <path d="M80 -74 C94 -34 88 2 70 14 L38 18 L46 -8 C54 -28 58 -50 60 -74 Z" fill={look.suit} />
      <rect x="-50" y="8" width="14" height="10" rx="3" fill={look.shirt} />
      <ellipse cx="-30" cy="15" rx="13" ry="8" fill={look.skin} />
      <g className={`iv-part ${writing ? "iv-write" : ""}`}>
        <rect x="36" y="8" width="14" height="10" rx="3" fill={look.shirt} />
        <ellipse cx="28" cy="15" rx="13" ry="8" fill={look.skin} />
        <line x1="20" y1="20" x2="34" y2="0" stroke="#222" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* water bottle */}
      <g transform="translate(92 0)">
        <rect x="-9" y="-40" width="18" height="52" rx="6" fill="#dbeaf5" opacity="0.85" stroke="#b9cfe0" />
        <rect x="-9" y="-18" width="18" height="12" fill="#2f5a96" opacity="0.75" />
        <rect x="-6" y="-48" width="12" height="9" rx="2" fill="#2f5a96" />
      </g>
    </g>
  );
}

function NamePlate({ x, member, active }: { x: number; member: PanelMember; active: boolean }) {
  return (
    <g transform={`translate(${x} ${DESK_Y + 44})`}>
      <rect x="-70" y="0" width="140" height="44" rx="3" fill="#ffffff" stroke={active ? "#1b3a6b" : "#c3cad3"} strokeWidth={active ? 2 : 1} />
      <rect x="-70" y="0" width="140" height="5" rx="2" fill={active ? "#1b3a6b" : "#8a94a3"} />
      <text x="0" y="20" textAnchor="middle" fontSize="11" fill="#6b6f7a" fontFamily="Pretendard Variable, sans-serif">
        {member.role} {member.title}
      </text>
      <text x="0" y="37" textAnchor="middle" fontSize="15" fontWeight="700" fill="#111827" letterSpacing="4" fontFamily="Pretendard Variable, sans-serif">
        {member.name}
      </text>
    </g>
  );
}
