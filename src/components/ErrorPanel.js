import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
import { Button } from "./ui/Button";
const COPY = {
    network: { title: "네트워크 연결이 끊겼습니다", body: "AI 면접관에 연결하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요." },
    timeout: { title: "응답이 지연되고 있습니다", body: "AI 응답 시간이 초과되었습니다. 다시 시도하거나 모의(Mock) 면접관으로 이어갈 수 있습니다." },
    unavailable: { title: "AI 면접관을 사용할 수 없습니다", body: "AI 서비스가 설정되지 않았거나 일시적으로 사용할 수 없습니다." },
    rate_limited: { title: "요청이 많습니다", body: "잠시 후 다시 시도해 주세요." },
    parse: { title: "AI 응답을 읽지 못했습니다", body: "AI가 예상과 다른 형식으로 응답했습니다. 다시 시도하면 대부분 해결됩니다." },
    refusal: { title: "AI가 응답하지 않았습니다", body: "이 답변에 대해 AI가 응답하지 못했습니다. 다시 시도하거나 모의 면접관으로 이어가 주세요." },
    server: { title: "AI 서비스 오류", body: "AI 서비스에서 오류가 발생했습니다. 다시 시도하거나 모의 면접관으로 이어가 주세요." },
    injected: { title: "테스트 오류", body: "디버그: 오류 처리를 확인하기 위해 일부러 발생시킨 오류입니다." },
};
export function ErrorPanel({ error, canUseMock, onRetry, onMock }) {
    const c = COPY[error.kind] ?? { title: "문제가 발생했습니다", body: error.message };
    return (_jsxs(motion.div, { role: "alert", initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, className: "w-full rounded-xl border border-warn/40 bg-surface p-6 text-center shadow-sm", children: [_jsx("p", { className: "label text-warn", children: "\uBA74\uC811 \uC77C\uC2DC \uC911\uB2E8" }), _jsx("h2", { className: "mt-2 text-lg font-semibold text-ink", children: c.title }), _jsx("p", { className: "mt-2 text-sm leading-relaxed text-muted", children: c.body }), _jsx("p", { className: "mt-1 text-xs text-faint", children: "\uC9C0\uAE08\uAE4C\uC9C0\uC758 \uB2F5\uBCC0\uC740 \uADF8\uB300\uB85C \uBCF4\uC874\uB429\uB2C8\uB2E4." }), _jsxs("div", { className: "mt-5 flex flex-wrap justify-center gap-2", children: [_jsx(Button, { variant: "primary", size: "md", onClick: onRetry, children: "\uB2E4\uC2DC \uC2DC\uB3C4" }), canUseMock && (_jsx(Button, { variant: "secondary", size: "md", onClick: onMock, children: "\uBAA8\uC758 \uBA74\uC811\uAD00\uC73C\uB85C \uACC4\uC18D" }))] })] }));
}
