/**
 * A Korean company interview room, seen from the candidate's chair:
 * a long desk, a three-person panel with name plates, water bottles,
 * documents, a wall screen and a wall clock that shows the real time.
 *
 * The interviewer who asks the current question talks; while answers are
 * reviewed the whole panel looks down and writes on the evaluation sheet.
 *
 * Two scenes: the photographed room and panel (PhotoScene) when every seat has
 * photos, otherwise the drawn room with SVG figures.
 */
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useNow } from "../hooks/useTimer";
import type { PanelMember, Seat } from "../config/panel";
import { PANEL_PHOTOS, PHOTO_BOX, photoSrc, photosEnabled, type PhotoState } from "../config/panelPhotos";

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
  className?: string;
}

const SEAT_X: Record<Seat, number> = { left: 330, center: 600, right: 870 };
const DESK_Y = 372;
const SCENE = { width: 1200, height: 520 };
/**
 * Where things are in each scene. `top`: just above the tallest hair — however short the room gets,
 * the crop never starts below it. `eyes`: a band too thin for whole heads is centred here, so it shows
 * eyes to chin rather than hair. `bottom`: the lowest part worth showing (name plates).
 */
interface FaceBand {
  top: number;
  eyes: number;
  bottom: number;
}
const DRAWN_FACES: FaceBand = { top: 136, eyes: 208, bottom: 520 };
/** On a phone the room shows only the panel — from the left interviewer's shoulder to the right one's. */
const PANEL_SPAN = { x: 240, width: 720 };
const NARROW_PX = 640;

/**
 * The part of the scene to show for the element's size. Phones zoom in on the panel (PANEL_SPAN);
 * wider screens show the full width. When that leaves a horizontal band, it is bottom-anchored but
 * never cuts into the heads — the name plates go first. When the element is taller
 * than the scene, the full height shows and preserveAspectRatio crops the sides.
 */
function useViewBox(faces: FaceBand) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (!size || size.w === 0) return { ref, viewBox: `0 0 ${SCENE.width} ${SCENE.height}` };
  const narrow = size.w < NARROW_PX;
  const x = narrow ? PANEL_SPAN.x : 0;
  const width = narrow ? PANEL_SPAN.width : SCENE.width;
  const visible = (width * size.h) / size.w;
  if (visible >= SCENE.height) return { ref, viewBox: `0 0 ${SCENE.width} ${SCENE.height}` };
  const spare = faces.bottom - visible;
  const y = visible < 2 * (faces.eyes - faces.top) ? faces.eyes - visible / 2 : Math.max(0, Math.min(spare, faces.top));
  return { ref, viewBox: `${x} ${y.toFixed(1)} ${width} ${visible.toFixed(1)}` };
}

export function InterviewRoom({ panel, speaking, mode, activity = 0, roomLabel = "제2면접실", companyName, className = "" }: Props) {
  const [photos] = useState(photosEnabled);
  const { ref, viewBox } = useViewBox(photos ? PHOTO_FACES : DRAWN_FACES);
  return (
    <svg
      ref={ref}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
      className={`block h-full w-full ${className}`}
      role="img"
      aria-label={`면접실. 면접관 3명이 책상에 앉아 있습니다. ${
        mode === "asking" && speaking ? `${panel[speaking].name} ${panel[speaking].title}이 질문하고 있습니다.` : mode === "reviewing" ? "면접관들이 답변을 검토하고 있습니다." : ""
      }`}
    >
      {photos ? (
        <PhotoScene panel={panel} speaking={speaking} mode={mode} activity={activity} roomLabel={roomLabel} companyName={companyName} />
      ) : (
      <>
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
          {companyName ? `${companyName} 모의면접` : "모의면접"} {roomLabel}
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
      {/* table banner — visible unless the room is squeezed so flat that the faces need the space */}
      <g transform={`translate(600 ${DESK_Y + 106})`}>
        <rect x="-190" y="0" width="380" height="30" rx="2" fill="#1f2b45" />
        <text x="0" y="20" textAnchor="middle" fontSize="14" fontWeight="700" fill="#eef1f4" letterSpacing="2" fontFamily="Pretendard Variable, sans-serif">
          {companyName ? `${companyName} 모의면접` : "INTERVIEW//AI 모의면접"} {roomLabel}
        </text>
      </g>
      {(["left", "center", "right"] as Seat[]).map((seat) => (
        <NamePlate key={seat} x={SEAT_X[seat]} member={panel[seat]} active={mode === "asking" && speaking === seat} />
      ))}

      {/* speech bubble beside the interviewer who is talking */}
      {mode === "asking" && speaking && <SpeechBubble x={SEAT_X[speaking] + 44} y={DESK_Y - 232} />}
      </>
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

/*
 * Figures are drawn in a restrained, flat editorial style: realistic head/shoulder proportions,
 * tailored jackets, neutral expressions. Origin (0,0) is the desk edge under each seat.
 * Head: crown ≈ -224, eyes -181, chin -144. Shoulders ≈ ±86 at -112.
 */
const FACE =
  "M-27 -196 C-28 -210 -17 -218 0 -218 C17 -218 28 -210 27 -196 L27.5 -179 C27 -167 23.5 -158 17 -152 C11 -147 6 -144.5 0 -144.5 C-6 -144.5 -11 -147 -17 -152 C-23.5 -158 -27 -167 -27.5 -179 Z";
const FACE_SHADE = "M10 -217 C23 -213 28 -204 27.5 -186 L27.5 -179 C27 -167 23.5 -158 17 -152 C11 -147 6 -144.5 0 -144.5 C9 -150 16 -161 18.5 -176 C20.5 -192 18 -208 10 -217 Z";

function Hair({ look, layer }: { look: PanelMember["look"]; layer: "back" | "front" }) {
  const c = look.hair;
  const sheen = <path d="M-8 -221 C4 -224 16 -220 22 -212" stroke="#fff" strokeOpacity="0.07" strokeWidth="3" fill="none" strokeLinecap="round" />;
  if (look.hairStyle === "bob") {
    return layer === "back" ? (
      <path d="M-34 -150 C-40 -174 -41 -204 -29 -219 C-19 -231 19 -231 29 -219 C41 -204 40 -174 34 -150 C30 -146 25 -146 22 -150 L22 -190 L-22 -190 L-22 -150 C-25 -146 -30 -146 -34 -150 Z" fill={c} />
    ) : (
      <g>
        <path d="M-31 -166 C-35 -204 -23 -226 0 -227 C23 -228 35 -209 31 -170 C29 -186 25 -198 17 -205 C7 -199 -8 -196 -19 -197 C-24 -190 -28 -179 -31 -166 Z" fill={c} />
        {sheen}
      </g>
    );
  }
  if (layer === "back") return null;
  const sideburns = <path d="M-27.6 -194 L-25.2 -194 L-25.8 -184 L-27.6 -184.5 Z M27.6 -194 L25.2 -194 L25.8 -184 L27.6 -184.5 Z" fill={c} />;
  if (look.hairStyle === "side") {
    return (
      <g>
        <path d="M-30 -184 C-34 -214 -15 -229 5 -228 C25 -227 34 -212 30 -186 C28 -196 24 -203 19 -205 C9 -200 -6 -201 -17 -207 C-23 -201 -27 -193 -30 -184 Z" fill={c} />
        <path d="M-17 -207 C-6 -213 8 -214 19 -205" stroke="#000" strokeOpacity="0.16" strokeWidth="1" fill="none" />
        {sideburns}
        {sheen}
      </g>
    );
  }
  if (look.hairStyle === "neat") {
    return (
      <g>
        <path d="M-30 -185 C-33 -214 -16 -228 3 -228 C24 -228 34 -213 30 -187 C29 -194 27 -199 23 -202 C14 -207 0 -207 -10 -209 C-16 -203 -24 -196 -30 -185 Z" fill={c} />
        <path d="M-10 -209 C-9 -216 -7 -222 -4 -226" stroke="#fff" strokeOpacity="0.1" strokeWidth="1.2" fill="none" />
        {sideburns}
        {sheen}
      </g>
    );
  }
  return (
    <g>
      <path d="M-30 -186 C-31 -215 -14 -226 0 -226 C14 -226 31 -215 30 -186 C26 -200 13 -205 0 -205 C-13 -205 -26 -200 -30 -186 Z" fill={c} />
      {sideburns}
      {sheen}
    </g>
  );
}

function InterviewerBody({ x, member, talking, reviewing, nodding, nodDelay }: { x: number; member: PanelMember; talking: boolean; reviewing: boolean; nodding: boolean; nodDelay: number }) {
  const { look } = member;
  const narrow = look.hairStyle === "bob";
  const lip = narrow ? "#a9645a" : "#9a6457";
  return (
    <g transform={`translate(${x} ${DESK_Y})`}>
      {/* high-back chair */}
      <path d="M-66 -24 L-66 -226 C-66 -244 -54 -254 -36 -254 L36 -254 C54 -254 66 -244 66 -226 L66 -24 Z" fill="#23272e" />
      <path d="M-56 -30 L-56 -222 C-56 -236 -48 -244 -34 -244 L34 -244 C48 -244 56 -236 56 -222 L56 -30 Z" fill="#2c3139" />
      <path d="M-56 -196 L56 -196" stroke="#1d2127" strokeWidth="1.5" />

      {/* jacket (sleeves are drawn with the desk items so the forearms can rest on the desk) */}
      <g transform={narrow ? "scale(0.93 1)" : undefined}>
        <path d="M-88 40 L-86 -80 C-85 -102 -78 -113 -60 -119 L-15 -131 L15 -131 L60 -119 C78 -113 85 -102 86 -80 L88 40 Z" fill={look.suit} />
        <path d="M-15 -131 L0 -74 L15 -131 Z" fill={look.shirt} />
        {/* neck */}
        <path d="M-11 -154 L-12 -129 C-6 -126 6 -126 12 -129 L11 -154 Z" fill={look.skin} />
        <path d="M-11.6 -143 C-6 -136 6 -136 11.6 -143 L11.8 -135 C6 -130 -6 -130 -11.8 -135 Z" fill="#000" opacity="0.12" />
        {look.tie ? (
          <>
            <path d="M-12.5 -133 C-6 -128 6 -128 12.5 -133 L12 -129 L3 -116 L0 -121 L-3 -116 L-12 -129 Z" fill={look.shirt} />
            <path d="M-12 -129 L-3 -116 M12 -129 L3 -116" stroke="#000" strokeOpacity="0.14" strokeWidth="0.8" />
            <path d="M-4.5 -123 L4.5 -123 L3.5 -114 L-3.5 -114 Z" fill={look.tie} />
            <path d="M-3.5 -114 L3.5 -114 L7 -88 L0 -79 L-7 -88 Z" fill={look.tie} />
            <path d="M0 -114 L3.5 -114 L7 -88 L0 -79 Z" fill="#000" opacity="0.14" />
          </>
        ) : narrow ? (
          <path d="M-12.5 -131 C-8 -118 -4 -106 0 -98 C4 -106 8 -118 12.5 -131" fill="none" stroke="#000" strokeOpacity="0.1" strokeWidth="1" />
        ) : (
          <>
            <path d="M-12.5 -133 C-6 -128 6 -128 12.5 -133 L12 -129 L4 -113 L0 -120 L-4 -113 L-12 -129 Z" fill={look.shirt} />
            <path d="M-12 -129 L-4 -113 M12 -129 L4 -113 M0 -120 L0 -104" stroke="#000" strokeOpacity="0.14" strokeWidth="0.8" />
            <circle cx="0" cy="-96" r="1.1" fill="#000" opacity="0.2" />
          </>
        )}
        {/* notch lapels */}
        <path d="M-15 -131 L-31 -124 L-27 -107 L-36 -103 L-3 -70 L-1 -79 Z" fill={look.suit} />
        <path d="M15 -131 L31 -124 L27 -107 L36 -103 L3 -70 L1 -79 Z" fill={look.suit} />
        <path d="M-15 -131 L-31 -124 L-27 -107 L-36 -103 L-3 -70 L-1 -79 Z M15 -131 L31 -124 L27 -107 L36 -103 L3 -70 L1 -79 Z" fill="#000" opacity="0.1" />
        <path d="M-15 -131 L-1 -79 M15 -131 L1 -79" stroke="#fff" strokeOpacity="0.1" strokeWidth="1" />
        <path d="M-36 -103 L-3 -70 M36 -103 L3 -70" stroke="#000" strokeOpacity="0.22" strokeWidth="1" />
        {/* chest pocket, buttons */}
        <path d="M32 -90 L52 -92" stroke="#000" strokeOpacity="0.22" strokeWidth="1.4" />
        {look.tie && <path d="M36 -91 L40 -95.5 L44 -92 L48 -96.5 L51 -92 Z" fill="#f4f5f7" />}
        <circle cx="0" cy="-58" r="2" fill="#000" opacity="0.35" />
        <circle cx="0" cy="-34" r="2" fill="#000" opacity="0.35" />
      </g>

      {/* head (outer group offsets it; the inner one carries the CSS nod/look-down transforms) */}
      <g transform="translate(0 4)">
        <g className={`iv-part ${reviewing ? "iv-look-down" : nodding ? "iv-nod" : ""}`} style={nodding ? { animationDelay: `${nodDelay}s` } : undefined}>
          <Hair look={look} layer="back" />
          {!narrow && (
            <>
              <path d="M-27 -186 C-33 -187 -34 -176 -31 -170 C-30 -167 -28 -166 -26.5 -167 Z" fill={look.skin} />
              <path d="M27 -186 C33 -187 34 -176 31 -170 C30 -167 28 -166 26.5 -167 Z" fill={look.skin} />
              <path d="M27 -186 C33 -187 34 -176 31 -170 C30 -167 28 -166 26.5 -167 Z" fill="#000" opacity="0.1" />
            </>
          )}
          <path d={FACE} fill={look.skin} />
          <path d={FACE_SHADE} fill="#000" opacity="0.07" />
          <Hair look={look} layer="front" />

          {/* brows */}
          <path
            d={
              reviewing
                ? "M-18 -188.5 Q-12 -190.5 -5 -189.5 L-5 -188 Q-12 -189 -18 -187 Z M18 -188.5 Q12 -190.5 5 -189.5 L5 -188 Q12 -189 18 -187 Z"
                : "M-18 -189.5 Q-12 -193 -5 -191.5 L-5 -189.6 Q-12 -190.8 -18 -188 Z M18 -189.5 Q12 -193 5 -191.5 L5 -189.6 Q12 -190.8 18 -188 Z"
            }
            fill={look.hair}
          />
          {/* eyes */}
          {reviewing ? (
            <path d="M-16 -179.5 Q-11 -177.2 -6 -179.5 M6 -179.5 Q11 -177.2 16 -179.5" stroke="#2b221d" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          ) : (
            <g className="iv-part iv-blink" style={{ animationDelay: `${nodDelay * 1.7}s` }}>
              <path d="M-16 -181 Q-11 -185 -6 -181 Q-11 -178.4 -16 -181 Z M6 -181 Q11 -185 16 -181 Q11 -178.4 6 -181 Z" fill="#f6f2ec" />
              <circle cx="-11" cy="-181.2" r="2.3" fill="#2a201b" />
              <circle cx="11" cy="-181.2" r="2.3" fill="#2a201b" />
              <path d="M-16.5 -181 Q-11 -185.4 -5.5 -181.3 M5.5 -181.3 Q11 -185.4 16.5 -181" stroke="#241c18" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            </g>
          )}
          {look.glasses && (
            <g fill="#ffffff" fillOpacity="0.06" stroke="#26282c" strokeWidth="1.3">
              <rect x="-19.5" y="-186.5" width="15.5" height="10.5" rx="2.5" />
              <rect x="4" y="-186.5" width="15.5" height="10.5" rx="2.5" />
              <path d="M-4 -183 Q0 -185 4 -183 M-19.5 -184 L-27 -185 M19.5 -184 L27 -185" fill="none" />
            </g>
          )}
          {/* nose */}
          <path d="M2.5 -180 C3.5 -174 5 -169 3.5 -166.5" stroke="#000" strokeOpacity="0.16" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M-4 -165.8 Q0 -163.8 4 -165.8" stroke="#000" strokeOpacity="0.22" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          {/* mouth — neutral, attentive */}
          {talking ? (
            <g>
              <path d="M-5.5 -156.2 Q0 -157.2 5.5 -156.2 Q0 -151.8 -5.5 -156.2 Z" fill="#5a2c27" className="iv-part iv-talk" />
            </g>
          ) : (
            <>
              <path d="M-7 -156 Q0 -155.2 7 -156" stroke={lip} strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <path d="M-3.5 -152.8 Q0 -152 3.5 -152.8" stroke="#000" strokeOpacity="0.1" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </>
          )}
        </g>
      </g>
    </g>
  );
}

/* ─────────────────────────── photographed panel ─────────────────────────── */

/**
 * The photo room (public/panel/room.webp, drawn at 1200x520): three chairs behind a wooden desk
 * whose far edge is at PHOTO_DESK_Y. The room is drawn twice — whole, then only the desk on top —
 * so the interviewers sit in the chairs behind the desk.
 */
const ROOM_SRC = "/panel/room.webp";
const PHOTO_SEAT_X: Record<Seat, number> = { left: 316, center: 600, right: 886 };
const PHOTO_DESK_Y = 414;
/** Frame width in scene units: shoulders about as wide as the chair backs. */
const PHOTO_W = 240;
const PHOTO_H = (PHOTO_W * PHOTO_BOX.height) / PHOTO_BOX.width;
const PHOTO_TOP = PHOTO_DESK_Y + 4 - PHOTO_H;
const PHOTO_FACES: FaceBand = { top: PHOTO_TOP - 4, eyes: PHOTO_TOP + 52, bottom: PHOTO_DESK_Y + 64 };
/** How long each frame holds, per state (ms). Talking changes gesture often; listening barely moves. */
const HOLD: Record<PhotoState, number> = { talk: 2300, review: 3400, think: 4200, idle: 6500 };

function PhotoScene({ panel, speaking, mode, activity, roomLabel, companyName }: Required<Pick<Props, "panel" | "speaking" | "mode" | "activity" | "roomLabel">> & Pick<Props, "companyName">) {
  return (
    <>
      <defs>
        <clipPath id="photo-desk">
          <rect x="0" y={PHOTO_DESK_Y} width={SCENE.width} height={SCENE.height - PHOTO_DESK_Y} />
        </clipPath>
      </defs>
      <image href={ROOM_SRC} width={SCENE.width} height={SCENE.height} preserveAspectRatio="none" />

      {/* the wall display */}
      <text x="601" y="170" textAnchor="middle" fill="#e9edf5" fontSize="22" fontFamily="JetBrains Mono, monospace" letterSpacing="3" opacity="0.92">
        INTERVIEW<tspan fill="#7fa6e0">//</tspan>AI
      </text>
      <text x="601" y="196" textAnchor="middle" fill="#9fb0c9" fontSize="14" fontFamily="Pretendard Variable, sans-serif" opacity="0.92">
        {companyName ? `${companyName} 모의면접` : "모의면접"} {roomLabel}
      </text>

      {(["left", "center", "right"] as Seat[]).map((seat, i) => (
        <PhotoInterviewer
          key={seat}
          seat={seat}
          state={mode === "asking" && speaking === seat ? "talk" : mode === "reviewing" ? "review" : mode === "listening" && activity > 0 && seat !== "center" ? "think" : "idle"}
          offset={i}
        />
      ))}

      <image href={ROOM_SRC} width={SCENE.width} height={SCENE.height} preserveAspectRatio="none" clipPath="url(#photo-desk)" />
      {/* contact shadow where the panel meets the desk */}
      <rect x="0" y={PHOTO_DESK_Y} width={SCENE.width} height="5" fill="#000" opacity="0.12" />

      {(["left", "center", "right"] as Seat[]).map((seat) => (
        <g key={seat} transform={`translate(${PHOTO_SEAT_X[seat]} ${PHOTO_DESK_Y + 12}) scale(0.86) translate(${-PHOTO_SEAT_X[seat]} 0)`}>
          <NamePlate x={PHOTO_SEAT_X[seat]} y={0} member={panel[seat]} active={mode === "asking" && speaking === seat} />
        </g>
      ))}
      {mode === "asking" && speaking && <SpeechBubble x={speaking === "right" ? PHOTO_SEAT_X[speaking] - 124 : PHOTO_SEAT_X[speaking] + 56} y={PHOTO_TOP + 10} />}
    </>
  );
}

/** A photographed interviewer: cross-fades between pose frames for the current state. */
function PhotoInterviewer({ seat, state, offset }: { seat: Seat; state: PhotoState; offset: number }) {
  const set = PANEL_PHOTOS[seat]!;
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(offset);
  useEffect(() => {
    if (reduce || set[state] < 2) return;
    const id = window.setInterval(() => setTick((t) => t + 1), HOLD[state] + offset * 370);
    return () => window.clearInterval(id);
  }, [reduce, set, state, offset]);
  const active = tick % set[state];
  const states = Object.keys(set) as PhotoState[];
  return (
    <g transform={`translate(${PHOTO_SEAT_X[seat] - PHOTO_W / 2} ${PHOTO_TOP})`}>
      {states.flatMap((st) =>
        Array.from({ length: set[st] }, (_, n) => (
          <image
            key={`${st}-${n}`}
            href={photoSrc(seat, st, n)}
            width={PHOTO_W}
            height={PHOTO_H}
            preserveAspectRatio="xMidYMax meet"
            style={{ opacity: st === state && n === active ? 1 : 0, transition: reduce ? undefined : "opacity 420ms ease" }}
          />
        )),
      )}
    </g>
  );
}

function SpeechBubble({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 h58 a10 10 0 0 1 10 10 v18 a10 10 0 0 1 -10 10 h-40 l-14 12 l2 -12 h-6 a10 10 0 0 1 -10 -10 v-18 a10 10 0 0 1 10 -10 z" fill="#ffffff" stroke="#1b3a6b" strokeOpacity="0.35" />
      {[0, 1, 2].map((d) => (
        <circle key={d} cx={18 + d * 14} cy="19" r="4" fill="#1b3a6b" className="iv-part" style={{ animation: `iv-dot 1s ease-in-out ${d * 0.15}s infinite` }} />
      ))}
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
      {/* sleeves resting on the desk */}
      <g transform={member.look.hairStyle === "bob" ? "scale(0.93 1)" : undefined}>
        <path d="M-60 -119 C-78 -114 -87 -103 -88 -80 C-91 -44 -92 -6 -80 8 C-70 16 -58 20 -45 20 L-41 5 C-52 1 -60 -9 -63 -30 C-66 -58 -66 -92 -60 -119 Z" fill={look.suit} />
        <path d="M60 -119 C78 -114 87 -103 88 -80 C91 -44 92 -6 80 8 C70 16 58 20 45 20 L41 5 C52 1 60 -9 63 -30 C66 -58 66 -92 60 -119 Z" fill={look.suit} />
        <path d="M-88 -80 C-91 -44 -92 -6 -80 8 C-74 12 -68 15 -62 17 C-78 4 -84 -30 -82 -80 C-82 -96 -76 -108 -66 -116 C-80 -110 -87 -100 -88 -80 Z" fill="#000" opacity="0.2" />
        <path d="M88 -80 C91 -44 92 -6 80 8 C74 12 68 15 62 17 C78 4 84 -30 82 -80 C82 -96 76 -108 66 -116 C80 -110 87 -100 88 -80 Z" fill="#000" opacity="0.24" />
        <path d="M-60 -119 C-66 -92 -66 -58 -63 -30 M60 -119 C66 -92 66 -58 63 -30" stroke="#000" strokeOpacity="0.2" strokeWidth="1" fill="none" />
        <path d="M-78 -4 C-68 3 -58 5 -50 5 M78 -4 C68 3 58 5 50 5" stroke="#000" strokeOpacity="0.2" strokeWidth="1" fill="none" />
        <path d="M-62 -118 C-74 -114 -82 -107 -85 -96" stroke="#fff" strokeOpacity="0.08" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      {/* hands: left resting, right holding a pen */}
      <path d="M-45 20 L-41 5 L-37 6 L-40 21 Z" fill={look.shirt} />
      <path d="M-39 7 C-32 4 -22 5 -16 9 C-12 12 -13 18 -19 19.5 L-38 21 C-43 20 -43 10 -39 7 Z" fill={look.skin} />
      <path d="M-30 11 L-18 12.5 M-30 15 L-17 16" stroke="#000" strokeOpacity="0.1" strokeWidth="0.9" />
      <g className={`iv-part ${writing ? "iv-write" : ""}`}>
        <path d="M45 20 L41 5 L37 6 L40 21 Z" fill={look.shirt} />
        <path d="M39 7 C32 4 22 5 16 9 C12 12 13 18 19 19.5 L38 21 C43 20 43 10 39 7 Z" fill={look.skin} />
        <line x1="17" y1="22" x2="31" y2="-2" stroke="#1d2026" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="17" y1="22" x2="19" y2="18.5" stroke="#b9bec6" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M22 9 C18 8 16 12 19 14 C21 15 24 13 22 9 Z" fill={look.skin} />
        <path d="M22 9 C18 8 16 12 19 14" stroke="#000" strokeOpacity="0.14" strokeWidth="0.9" fill="none" />
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

function NamePlate({ x, y = DESK_Y + 44, member, active }: { x: number; y?: number; member: PanelMember; active: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
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
