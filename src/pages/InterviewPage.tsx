import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnswerInput } from "../components/AnswerInput";
import { CompletionScreen } from "../components/CompletionScreen";
import { ErrorPanel } from "../components/ErrorPanel";
import { InterviewHeader } from "../components/InterviewHeader";
import { InterviewNotes } from "../components/InterviewNotes";
import { InterviewRoom, type RoomMode } from "../components/InterviewRoom";
import { IntroSequence } from "../components/IntroSequence";
import { LastAnswer } from "../components/LastAnswer";
import { QuestionPanel } from "../components/QuestionPanel";
import { QuestionStepper } from "../components/QuestionStepper";
import { WaitingBar } from "../components/WaitingBar";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { CloseIcon } from "../components/ui/icons";
import { COPY } from "../config/copy";
import { INTERVIEW_TYPE_KO } from "../config/labelsKo";
import { applicantNumber, buildPanel, seatFor, type Seat } from "../config/panel";
import { getCompany } from "../../shared/companies";
import type { InterviewController } from "../hooks/useInterview";
import { useElapsed, useNow } from "../hooks/useTimer";
import { isSpeechRecognitionSupported } from "../services/speech/speechRecognition";
import { isSpeechSynthesisSupported } from "../services/speech/speechSynthesis";
import { currentQuestion, type InterviewState } from "../state/interviewMachine";

function roomMode(s: InterviewState): RoomMode {
  switch (s.phase) {
    case "ASKING":
    case "FOLLOW_UP":
    case "NEXT_QUESTION":
      return "asking";
    case "LISTENING":
      return "listening";
    case "ANALYZING":
      return "reviewing";
    default:
      return "idle";
  }
}

export function InterviewPage({ ctl, modeLabel, engineLabel }: { ctl: InterviewController; modeLabel: string; engineLabel: string }) {
  const { state, actions, voiceOn, fallbackActive } = ctl;
  const interview = state.interview!;
  const copy = COPY[interview.config.language];
  const panel = useMemo(() => buildPanel(interview.config.position), [interview.config.position]);
  const applicantNo = applicantNumber(interview.id);
  const company = getCompany(interview.config.companyId);
  const q = currentQuestion(state);
  const [draft, setDraft] = useState("");
  const [activity, setActivity] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const running = !["COMPLETED", "RESULT", "IDLE", "SETUP", "INTRO"].includes(state.phase);
  const elapsed = useElapsed(state.startedAt, running);

  const inputEnabled = (state.phase === "LISTENING" || state.phase === "ASKING") && !!q && !q.answer;
  const lastAnswered = [...interview.questions].reverse().find((x) => x.answer);
  const showLastAnswer = (state.phase === "ANALYZING" || state.phase === "FOLLOW_UP" || state.phase === "NEXT_QUESTION") && lastAnswered?.answer;
  const answeredCount = interview.questions.filter((x) => x.feedback).length;
  const canEnd = ["ASKING", "LISTENING", "ERROR"].includes(state.phase);

  // Who is talking: the asker of the current question, or — while reacting — the asker of the last answered one.
  const transitioning = state.phase === "FOLLOW_UP" || state.phase === "NEXT_QUESTION";
  const speakerSeat: Seat = transitioning && lastAnswered ? seatFor(lastAnswered.type, lastAnswered.isFollowUp) : q ? seatFor(q.type, q.isFollowUp) : "center";
  const mode = roomMode(state);
  const now = useNow(state.phase === "LISTENING" && !draft.trim(), 1000);
  const silentFor = state.phase === "LISTENING" && !draft.trim() && state.questionStartedAt ? (now - state.questionStartedAt) / 1000 : 0;

  const statusLine =
    mode === "asking"
      ? `${panel[speakerSeat].name} ${panel[speakerSeat].title}이 ${transitioning ? "답변에 반응하고 있습니다" : "질문하고 있습니다"}`
      : mode === "listening"
        ? silentFor > 20 && activity === 0
          ? `${panel.center.name} ${panel.center.title}: “천천히 생각하셔도 괜찮습니다.”`
          : "면접관들이 답변을 기다리고 있습니다"
        : mode === "reviewing"
          ? "면접관들이 답변을 검토하며 평가표를 작성하고 있습니다"
          : "";

  const submit = (answerMode: "text" | "voice") => {
    actions.submitAnswer(draft, answerMode);
    setDraft("");
  };

  const questionIndex = Math.max(1, interview.questions.length);
  const busyText =
    state.phase === "ANALYZING"
      ? "면접관들이 답변을 검토하고 있습니다"
      : state.phase === "FOLLOW_UP" || state.phase === "NEXT_QUESTION"
        ? "다음 질문을 준비하고 있습니다"
        : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <InterviewHeader
        index={questionIndex}
        total={interview.config.questionLimit}
        elapsed={elapsed}
        applicantNo={applicantNo}
        position={company ? `${company.shortName ?? company.name} · ${interview.config.position}` : interview.config.position}
        typeLabel={INTERVIEW_TYPE_KO[interview.config.interviewType]}
        voiceOn={voiceOn}
        voiceSupported={isSpeechSynthesisSupported()}
        onToggleVoice={() => actions.setVoice(!voiceOn)}
        onEnd={() => setConfirmEnd(true)}
        canEnd={canEnd}
        onOpenNotes={() => setNotesOpen(true)}
        modeLabel={fallbackActive ? "MOCK (대체)" : modeLabel}
      />

      <main className="mx-auto grid w-full max-w-[1440px] flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-h-0 flex-col">
          {/* the room, seen from the candidate's chair */}
          <div
            className={`relative w-full overflow-hidden border-b border-line transition-[height] duration-300 lg:h-[clamp(240px,calc(100dvh-500px),470px)] ${
              composing ? "h-[13vh] min-h-[96px]" : "h-[25vh] min-h-[160px] sm:h-[38vh]"
            }`}
          >
            <InterviewRoom panel={panel} speaking={speakerSeat} mode={mode} activity={activity} companyName={company?.shortName ?? company?.name} />
            {statusLine && (
              <div className="absolute top-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-2 rounded-md bg-black/55 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm sm:top-auto sm:bottom-3 sm:left-3 sm:text-[12px]" role="status">
                <span className={`h-1.5 w-1.5 rounded-full ${mode === "reviewing" ? "animate-pulse bg-[#f2c14e]" : mode === "listening" ? "bg-[#5fd39b]" : "animate-pulse bg-[#7fa6e0]"}`} />
                {statusLine}
              </div>
            )}
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-3 pt-3 pb-3 sm:px-6 sm:pt-4">
            <QuestionStepper questions={interview.questions} total={interview.config.questionLimit} showScores={interview.config.liveFeedback} />
            {state.phase === "ERROR" && state.error ? (
              <ErrorPanel error={state.error} canUseMock={!fallbackActive && ctl.status?.mode === "ai"} onRetry={actions.retry} onMock={actions.continueWithMock} />
            ) : (
              <QuestionPanel question={q} index={questionIndex} phase={state.phase} stage={state.stage} transitionText={state.transitionText} speaker={panel[speakerSeat]} copy={copy} onRepeat={isSpeechSynthesisSupported() ? actions.repeatQuestion : undefined} />
            )}
            <AnimatePresence>{showLastAnswer && <LastAnswer key={lastAnswered!.id} text={lastAnswered!.answer!} label={copy.yourAnswer} lang={copy.lang} />}</AnimatePresence>
            {ctl.speaking && state.phase === "ASKING" && (
              <button type="button" onClick={actions.skipSpeaking} className="self-center text-[12px] text-faint hover:text-ink">
                음성 건너뛰기 ›
              </button>
            )}
          </div>

          <div className="sticky bottom-0 z-20 mx-auto w-full max-w-3xl bg-gradient-to-t from-bg via-bg to-bg/0 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            {busyText ? (
              <WaitingBar text={busyText} />
            ) : (
            <AnswerInput
              value={draft}
              onChange={setDraft}
              onSubmit={submit}
              enabled={inputEnabled}
              copy={copy}
              lang={interview.config.language === "ko" ? "ko-KR" : "en-US"}
              timeLimit={interview.config.answerTimeLimit}
              questionStartedAt={state.phase === "LISTENING" ? state.questionStartedAt : null}
              onActivity={setActivity}
              onDontKnow={() => actions.submitAnswer(copy.dontKnowAnswer, "text")}
              onFocusChange={setComposing}
            />
            )}
          </div>
        </section>

        <aside className="sticky top-[60px] hidden h-[calc(100dvh-60px)] border-l border-line bg-surface lg:block" aria-label="면접 기록">
          <InterviewNotes questions={interview.questions} liveFeedback={interview.config.liveFeedback} copy={copy} />
        </aside>
      </main>

      {/* mobile notes drawer */}
      <AnimatePresence>
        {notesOpen && (
          <motion.div className="fixed inset-0 z-40 bg-black/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNotesOpen(false)}>
            <motion.div
              role="dialog"
              aria-label="면접 기록"
              className="absolute inset-x-0 bottom-0 h-[75dvh] rounded-t-2xl border-t border-line-strong bg-surface"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" aria-label="닫기" onClick={() => setNotesOpen(false)} className="absolute top-3 right-3 z-10 p-2 text-muted hover:text-ink">
                <CloseIcon />
              </button>
              <InterviewNotes questions={interview.questions} liveFeedback={interview.config.liveFeedback} copy={copy} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {state.phase === "INTRO" && (
        <IntroSequence
          config={interview.config}
          applicantNo={applicantNo}
          engineLabel={engineLabel}
          voiceInput={isSpeechRecognitionSupported()}
          voiceOutput={interview.config.voiceEnabled && isSpeechSynthesisSupported()}
          onDone={actions.onIntroDone}
        />
      )}
      {state.phase === "COMPLETED" && <CompletionScreen interview={interview} />}

      <Dialog
        open={confirmEnd}
        title="면접을 종료하시겠습니까?"
        onClose={() => setConfirmEnd(false)}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setConfirmEnd(false)}>
              계속 진행
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setConfirmEnd(false);
                actions.endInterview();
              }}
            >
              종료하기
            </Button>
          </>
        }
      >
        {answeredCount > 0
          ? `${interview.config.questionLimit}문항 중 ${answeredCount}문항에 답변하셨습니다. 지금 종료하면 답변한 문항만으로 평가표가 작성됩니다.`
          : "아직 답변한 문항이 없어 평가표가 작성되지 않습니다. 그래도 종료하시겠습니까?"}
      </Dialog>
    </div>
  );
}
