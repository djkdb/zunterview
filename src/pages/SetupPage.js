import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { motion } from "framer-motion";
import { DIFFICULTIES, EXPERIENCE_LEVELS, INTERVIEW_TYPES, LIMITS, PERSONAS } from "../../shared/schemas";
import { ModeBadge, TopBar } from "../components/TopBar";
import { CompanyPicker } from "../components/CompanyPicker";
import { COMPANIES, companyTracks, getCompany, guessTrack } from "../../shared/companies";
/** "전기" at a public enterprise → "전기직"; "개발" at a company → "개발자". */
function positionForTrack(category, track) {
    if (category === "공기업" || category === "공공기관")
        return /직$/.test(track) ? track : `${track}직`;
    if (track === "개발")
        return "개발자";
    return track;
}
import { Button } from "../components/ui/Button";
import { ArrowIcon } from "../components/ui/icons";
import { Segmented } from "../components/ui/Segmented";
import { Toggle } from "../components/ui/Toggle";
import { DIFFICULTY_KO, EXPERIENCE_KO, INTERVIEW_TYPE_HINT_KO, INTERVIEW_TYPE_KO, PERSONA_KO } from "../config/labelsKo";
import { ANSWER_TIME_OPTIONS, DEFAULT_CONFIG, POSITION_PRESETS, QUESTION_LENGTHS } from "../config/options";
import { isSpeechRecognitionSupported } from "../services/speech/speechRecognition";
import { isNeuralTts, isVoiceOutputAvailable } from "../services/speech/tts";
import { loadLastConfig, saveLastConfig } from "../utils/storage";
const DIFFICULTY_HINT = {
    easy: "분위기 적응용",
    normal: "실제 1차 면접",
    hard: "압박 면접",
};
/** Apply a company choice, keeping the job consistent with the chosen track / institution type. */
function withCompanyDefaults(p, id, track) {
    const next = { ...p, companyId: id, companyTrack: track };
    const co = getCompany(id);
    if (!co)
        return next;
    if (track && track !== "공통")
        return { ...next, position: positionForTrack(co.category, track) };
    const fromPreset = POSITION_PRESETS.includes(p.position);
    if (fromPreset && (co.category === "공기업" || co.category === "공공기관") && guessTrack(co, p.position) === "공통") {
        // Tech presets rarely fit a public institution; start from the administrative track.
        const t = companyTracks(co).find((x) => /사무|행정/.test(x));
        if (t)
            return { ...next, companyTrack: t, position: positionForTrack(co.category, t) };
    }
    return next;
}
function initialConfig(preset) {
    const saved = loadLastConfig();
    let merged = { ...DEFAULT_CONFIG, ...(saved ?? {}) };
    if (preset)
        merged = withCompanyDefaults(merged, preset.companyId, preset.track === "공통" ? undefined : preset.track);
    if (!getCompany(merged.companyId)) {
        merged.companyId = undefined;
        merged.companyTrack = undefined;
    }
    if (!isVoiceOutputAvailable())
        merged.voiceEnabled = false;
    return merged;
}
function Section({ no, title, children }) {
    return (_jsxs("section", { className: "rounded-xl border border-line bg-surface p-5 sm:p-6", children: [_jsxs("h2", { className: "mb-5 flex items-center gap-2.5 text-[15px] font-bold text-ink", children: [_jsx("span", { className: "flex h-6 w-6 items-center justify-center rounded-full bg-navy font-mono text-[11px] text-white", children: no }), title] }), _jsx("div", { className: "space-y-6", children: children })] }));
}
export function SetupPage({ status, onStart, onHome, preset }) {
    const [c, setC] = useState(() => initialConfig(preset));
    const isPreset = POSITION_PRESETS.includes(c.position);
    const [custom, setCustom] = useState(isPreset ? "" : c.position);
    const [useCustom, setUseCustom] = useState(!isPreset);
    const set = (k, v) => setC((p) => ({ ...p, [k]: v }));
    const position = (useCustom ? custom : c.position).trim();
    const valid = position.length > 0 && position.length <= LIMITS.position;
    const ttsOk = isVoiceOutputAvailable();
    const company = getCompany(c.companyId);
    const summaryRows = [
        ["지원 기업", company ? `${company.name}${c.companyTrack && c.companyTrack !== "공통" ? ` · ${c.companyTrack}` : ""}` : "일반 면접"],
        ["지원 직무", position || "—"],
        ["경력", EXPERIENCE_KO[c.experience]],
        ["면접", `${INTERVIEW_TYPE_KO[c.interviewType]} · ${DIFFICULTY_KO[c.difficulty]}`],
        ["분량", `${c.questionLimit}문항 · 약 ${c.questionLimit * 2}분`],
        ["면접관", `${PERSONA_KO[c.persona]} · 음성 ${c.voiceEnabled && ttsOk ? "켜짐" : "꺼짐"}`],
        ["답변 시간", c.answerTimeLimit ? `문항당 ${c.answerTimeLimit / 60}분` : "제한 없음"],
    ];
    const summaryLine = `${company ? `${company.shortName ?? company.name} · ` : ""}${INTERVIEW_TYPE_KO[c.interviewType]} · ${DIFFICULTY_KO[c.difficulty]} · ${c.questionLimit}문항 · 약 ${c.questionLimit * 2}분`;
    const start = () => {
        if (!valid)
            return;
        const company = getCompany(c.companyId);
        const config = { ...c, position, companyTrack: company ? (c.companyTrack ?? guessTrack(company, position)) : undefined };
        saveLastConfig(config);
        onStart(config);
    };
    return (_jsxs("div", { className: "min-h-dvh pb-28 sm:pb-16", children: [_jsx(TopBar, { onHome: onHome, modeBadge: _jsx(ModeBadge, { mode: status?.mode ?? null, detail: status?.model ?? undefined }) }), _jsxs("main", { className: "mx-auto w-full max-w-3xl px-4 sm:px-6 lg:max-w-5xl", children: [_jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, className: "pt-8 pb-6", children: [_jsx("p", { className: "text-sm font-semibold text-accent", children: "\uBA74\uC811 \uC811\uC218" }), _jsx("h1", { className: "mt-1.5 text-2xl font-extrabold text-navy sm:text-3xl", children: "\uC5B4\uB5A4 \uBA74\uC811\uC744 \uC900\uBE44\uD558\uC2DC\uB098\uC694?" }), _jsx("p", { className: "mt-2 text-[15px] text-muted", children: "\uC785\uB825\uD55C \uC815\uBCF4\uC640 \uB0B4 \uB2F5\uBCC0\uC744 \uBC14\uD0D5\uC73C\uB85C \uBA74\uC811\uAD00\uC774 \uB2E4\uC74C \uC9C8\uBB38\uC744 \uC815\uD569\uB2C8\uB2E4." })] }), _jsxs("div", { className: "lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6", children: [_jsxs("form", { id: "setup-form", className: "space-y-4", onSubmit: (e) => {
                                    e.preventDefault();
                                    start();
                                }, children: [COMPANIES.length > 0 && (_jsx(Section, { no: 1, title: "\uC9C0\uC6D0 \uAE30\uC5C5 (\uC120\uD0DD)", children: _jsx(CompanyPicker, { companyId: c.companyId, track: c.companyTrack, onChange: (id, track) => {
                                                const next = withCompanyDefaults(c, id, track);
                                                setC(next);
                                                if (next.position !== c.position) {
                                                    setUseCustom(!POSITION_PRESETS.includes(next.position));
                                                    setCustom(next.position);
                                                }
                                            } }) })), _jsxs(Section, { no: 2, title: "\uC9C0\uC6D0 \uC815\uBCF4", children: [_jsxs("fieldset", { children: [_jsx("legend", { className: "label mb-2.5", children: "\uC9C0\uC6D0 \uC9C1\uBB34" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [POSITION_PRESETS.map((p) => {
                                                                const active = !useCustom && c.position === p;
                                                                return (_jsx("button", { type: "button", "aria-pressed": active, onClick: () => {
                                                                        setUseCustom(false);
                                                                        set("position", p);
                                                                    }, className: `min-h-10 rounded-lg border px-3.5 text-sm transition-colors ${active ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line-strong bg-surface text-muted hover:border-accent/40 hover:text-ink"}`, children: p }, p));
                                                            }), _jsx("button", { type: "button", "aria-pressed": useCustom, onClick: () => setUseCustom(true), className: `min-h-10 rounded-lg border px-3.5 text-sm transition-colors ${useCustom ? "border-accent bg-accent-soft font-semibold text-accent" : "border-dashed border-line-strong text-muted hover:text-ink"}`, children: "+ \uC9C1\uC811 \uC785\uB825" })] }), useCustom && (_jsx("input", { autoFocus: true, value: custom, onChange: (e) => setCustom(e.target.value), maxLength: LIMITS.position, placeholder: "\uC608: \uB370\uC774\uD130 \uBD84\uC11D\uAC00, iOS \uAC1C\uBC1C\uC790, \uC778\uC0AC \uB2F4\uB2F9\uC790", "aria-label": "\uC9C0\uC6D0 \uC9C1\uBB34 \uC9C1\uC811 \uC785\uB825", className: "mt-3 h-12 w-full rounded-lg border border-line-strong bg-surface px-4 text-[16px] text-ink placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none" }))] }), _jsx(Segmented, { label: "\uACBD\uB825 \uAD6C\uBD84", value: c.experience, onChange: (v) => set("experience", v), columns: 4, options: EXPERIENCE_LEVELS.map((v) => ({ value: v, label: EXPERIENCE_KO[v] })) }), _jsxs("div", { children: [_jsxs("label", { htmlFor: "jd", className: "label mb-2.5 flex items-center justify-between", children: [_jsxs("span", { children: ["\uCC44\uC6A9\uACF5\uACE0 \u00B7 \uC9C1\uBB34\uAE30\uC220\uC11C ", _jsx("span", { className: "font-normal text-faint", children: "(\uC120\uD0DD)" })] }), _jsxs("span", { className: "font-normal", children: [c.jobDescription.length, "/", LIMITS.jobDescription] })] }), _jsx("textarea", { id: "jd", value: c.jobDescription, onChange: (e) => set("jobDescription", e.target.value.slice(0, LIMITS.jobDescription)), rows: 4, placeholder: "\uC9C0\uC6D0\uD558\uB294 \uACF5\uACE0\uC758 \uC790\uACA9\uC694\uAC74\u00B7\uC6B0\uB300\uC0AC\uD56D\uC744 \uBD99\uC5EC\uB123\uC73C\uBA74 \uD574\uB2F9 \uB0B4\uC6A9\uC73C\uB85C \uC9C8\uBB38\uD569\uB2C8\uB2E4. (\uC608: React, TypeScript, \uC131\uB2A5 \uCD5C\uC801\uD654 \uACBD\uD5D8 \uC6B0\uB300)", className: "w-full resize-y rounded-lg border border-line-strong bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none" }), _jsx("p", { className: "mt-1.5 text-[12px] text-faint", children: "\uC774\uB984\u00B7\uC5F0\uB77D\uCC98 \uB4F1 \uAC1C\uC778\uC815\uBCF4\uB294 \uB123\uC9C0 \uB9C8\uC138\uC694. \uC9C8\uBB38\uC744 \uB9DE\uCD94\uB294 \uB370\uC5D0\uB9CC \uC0AC\uC6A9\uB429\uB2C8\uB2E4." })] })] }), _jsxs(Section, { no: 3, title: "\uBA74\uC811 \uAD6C\uC131", children: [_jsx(Segmented, { label: "\uBA74\uC811 \uC720\uD615", value: c.interviewType, onChange: (v) => set("interviewType", v), columns: 5, options: INTERVIEW_TYPES.map((v) => ({ value: v, label: INTERVIEW_TYPE_KO[v], hint: INTERVIEW_TYPE_HINT_KO[v] })) }), _jsxs("div", { className: "grid gap-6 sm:grid-cols-2", children: [_jsx(Segmented, { label: "\uB09C\uC774\uB3C4", value: c.difficulty, onChange: (v) => set("difficulty", v), options: DIFFICULTIES.map((v) => ({ value: v, label: DIFFICULTY_KO[v], hint: DIFFICULTY_HINT[v] })) }), _jsx(Segmented, { label: "\uBB38\uD56D \uC218 (\uAF2C\uB9AC\uC9C8\uBB38 \uD3EC\uD568)", value: c.questionLimit, onChange: (v) => set("questionLimit", v), options: QUESTION_LENGTHS.map((v) => ({ value: v, label: `${v}문항`, hint: `약 ${v * 2}분` })) })] })] }), _jsxs(Section, { no: 4, title: "\uBA74\uC811 \uD658\uACBD", children: [_jsx(Segmented, { label: "\uBA74\uC811\uAD00 \uC2A4\uD0C0\uC77C", value: c.persona, onChange: (v) => set("persona", v), columns: 4, options: PERSONAS.map((v) => ({ value: v, label: PERSONA_KO[v] })) }), _jsxs("div", { className: "grid gap-6 sm:grid-cols-2", children: [_jsx(Segmented, { label: "\uBA74\uC811 \uC5B8\uC5B4", value: c.language, onChange: (v) => set("language", v), options: [{ value: "ko", label: "한국어" }, { value: "en", label: "영어 면접" }] }), _jsx(Segmented, { label: "\uBB38\uD56D\uB2F9 \uB2F5\uBCC0 \uC2DC\uAC04", value: c.answerTimeLimit, onChange: (v) => set("answerTimeLimit", v), options: ANSWER_TIME_OPTIONS })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(Toggle, { label: "\uBA74\uC811\uAD00 \uC74C\uC131", description: !ttsOk ? "이 브라우저는 음성 출력을 지원하지 않아요" : isNeuralTts() ? "Fish Audio 음성 · 면접관마다 다른 목소리" : "면접관이 질문을 소리 내어 읽어 줍니다", checked: c.voiceEnabled && ttsOk, onChange: (v) => set("voiceEnabled", v), disabled: !ttsOk }), _jsx(Toggle, { label: "\uC2E4\uC2DC\uAC04 \uD53C\uB4DC\uBC31", description: "\uBA74\uC811 \uAE30\uB85D\uC5D0 \uBB38\uD56D\uBCC4 \uC810\uC218\uB97C \uBC14\uB85C \uD45C\uC2DC", checked: c.liveFeedback, onChange: (v) => set("liveFeedback", v) })] }), _jsxs("p", { className: "text-[12px] leading-relaxed text-faint", children: [isSpeechRecognitionSupported()
                                                        ? "음성 답변 가능 — [음성 답변] 버튼을 누를 때만 마이크가 켜집니다."
                                                        : "이 브라우저는 음성 답변을 지원하지 않아 텍스트로 답변합니다.", " ", "\uCE74\uBA54\uB77C\uB294 \uC0AC\uC6A9\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."] })] }), _jsxs("div", { className: "fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:pt-4 lg:hidden", children: [_jsx("p", { className: "mb-2 truncate text-center text-[12px] text-muted sm:hidden", children: summaryLine }), _jsx(Button, { type: "submit", variant: "primary", size: "lg", disabled: !valid, className: "w-full flex-row-reverse sm:w-auto sm:px-12", icon: _jsx(ArrowIcon, { width: 18, height: 18 }), children: "\uC811\uC218\uD558\uACE0 \uB300\uAE30\uC2E4\uB85C \uC774\uB3D9" })] })] }), _jsx("aside", { className: "sticky top-20 hidden lg:block", "aria-label": "\uC811\uC218 \uC694\uC57D", children: _jsxs("div", { className: "overflow-hidden rounded-xl border border-line-strong bg-surface shadow-sm", children: [_jsx("div", { className: "bg-navy px-5 py-3 text-[14px] font-bold text-white", children: "\uC811\uC218 \uC694\uC57D" }), _jsx("dl", { className: "divide-y divide-line text-[13px]", children: summaryRows.map(([k, v]) => (_jsxs("div", { className: "flex gap-3 px-5 py-2.5", children: [_jsx("dt", { className: "w-16 shrink-0 text-faint", children: k }), _jsx("dd", { className: "min-w-0 flex-1 font-semibold break-keep text-ink", children: v })] }, k))) }), _jsxs("div", { className: "border-t border-line p-4", children: [_jsx(Button, { type: "submit", form: "setup-form", variant: "primary", size: "lg", disabled: !valid, className: "w-full flex-row-reverse", icon: _jsx(ArrowIcon, { width: 18, height: 18 }), children: "\uC811\uC218\uD558\uACE0 \uB300\uAE30\uC2E4\uB85C \uC774\uB3D9" }), _jsx("p", { className: "mt-2.5 text-center text-[11px] leading-relaxed text-faint", children: "\uBA74\uC811\uAD00 3\uC778\uC774 \uBC88\uAC08\uC544 \uC9C8\uBB38\uD558\uACE0, \uB2F5\uBCC0\uC5D0 \uB530\uB77C \uAF2C\uB9AC\uC9C8\uBB38\uC774 \uC774\uC5B4\uC9D1\uB2C8\uB2E4." })] })] }) })] })] })] }));
}
