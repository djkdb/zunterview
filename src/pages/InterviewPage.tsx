import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AIInterviewer, type InterviewerStatus } from "../components/AIInterviewer";
import { AnswerInput } from "../components/AnswerInput";
import { CompletionScreen } from "../components/CompletionScreen";
import { ErrorPanel } from "../components/ErrorPanel";
import { InterviewHeader } from "../components/InterviewHeader";
import { InterviewNotes } from "../components/InterviewNotes";
import { IntroSequence } from "../components/IntroSequence";
import { LastAnswer } from "../components/LastAnswer";
import { QuestionPanel } from "../components/QuestionPanel";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { CloseIcon } from "../components/ui/icons";
import { COPY } from "../config/copy";
import type { InterviewController } from "../hooks/useInterview";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useElapsed } from "../hooks/useTimer";
import { isSpeechRecognitionSupported } from "../services/speech/speechRecognition";
import { isSpeechSynthesisSupported } from "../services/speech/speechSynthesis";
import { currentQuestion, type InterviewState } from "../state/interviewMachine";

function interviewerStatus(s: InterviewState): InterviewerStatus {
  switch (s.phase) {
    case "ASKING":
    case "FOLLOW_UP":
    case "NEXT_QUESTION":
      return "ASKING";
    case "LISTENING":
      return "LISTENING";
    case "ANALYZING":
      return s.stage === "analyzing" ? "ANALYZING" : "THINKING";
    default:
      return "IDLE";
  }
}

export function InterviewPage({ ctl, modeLabel, engineLabel }: { ctl: InterviewController; modeLabel: string; engineLabel: string }) {
  const { state, actions, voiceOn, speaking, fallbackActive } = ctl;
  const interview = state.interview!;
  const copy = COPY[interview.config.language];
  const q = currentQuestion(state);
  const [draft, setDraft] = useState("");
  const [activity, setActivity] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const wide = useMediaQuery("(min-width: 640px)");
  const running = !["COMPLETED", "RESULT", "IDLE", "SETUP", "INTRO"].includes(state.phase);
  const elapsed = useElapsed(state.startedAt, running);

  const inputEnabled = (state.phase === "LISTENING" || state.phase === "ASKING") && !!q && !q.answer;
  const lastAnswered = [...interview.questions].reverse().find((x) => x.answer);
  const showLastAnswer = (state.phase === "ANALYZING" || state.phase === "FOLLOW_UP" || state.phase === "NEXT_QUESTION") && lastAnswered?.answer;
  const answeredCount = interview.questions.filter((x) => x.feedback).length;
  const canEnd = ["ASKING", "LISTENING", "ERROR"].includes(state.phase);

  const submit = useCallback(
    (mode: "text" | "voice") => {
      actions.submitAnswer(draft, mode);
      setDraft("");
    },
    [actions, draft],
  );

  const questionIndex = Math.max(1, interview.questions.length);

  return (
    <div className="flex min-h-dvh flex-col">
      <InterviewHeader
        index={questionIndex}
        total={interview.config.questionLimit}
        elapsed={elapsed}
        voiceOn={voiceOn}
        voiceSupported={isSpeechSynthesisSupported()}
        onToggleVoice={() => actions.setVoice(!voiceOn)}
        onEnd={() => setConfirmEnd(true)}
        canEnd={canEnd}
        onOpenNotes={() => setNotesOpen(true)}
        modeLabel={fallbackActive ? "MOCK MODE (FALLBACK)" : modeLabel}
      />

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-0 flex-col items-center px-4 sm:px-8">
          <div className="pt-5 pb-3 sm:pt-10 sm:pb-6">
            <AIInterviewer status={interviewerStatus(state)} activity={activity} size={wide ? "lg" : "sm"} speaking={speaking || !voiceOn} />
          </div>

          <div className="flex w-full flex-1 flex-col items-center gap-6 pb-4">
            {state.phase === "ERROR" && state.error ? (
              <ErrorPanel error={state.error} canUseMock={!fallbackActive && ctl.status?.mode === "ai"} onRetry={actions.retry} onMock={actions.continueWithMock} />
            ) : (
              <QuestionPanel question={q} index={questionIndex} phase={state.phase} stage={state.stage} transitionText={state.transitionText} copy={copy} />
            )}
            <AnimatePresence>{showLastAnswer && <LastAnswer key={lastAnswered!.id} text={lastAnswered!.answer!} label={copy.yourAnswer} lang={copy.lang} />}</AnimatePresence>
            {speaking && state.phase === "ASKING" && (
              <button type="button" onClick={actions.skipSpeaking} className="font-mono text-[10px] tracking-[0.2em] text-faint uppercase hover:text-ink">
                Skip voice ›
              </button>
            )}
          </div>

          <div className="sticky bottom-0 z-20 w-full max-w-3xl bg-gradient-to-t from-bg via-bg/95 to-transparent pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <AnswerInput
              value={draft}
              onChange={setDraft}
              onSubmit={submit}
              enabled={inputEnabled}
              copy={copy}
              lang={interview.config.language === "ko" ? "ko-KR" : "en-US"}
              timeLimit={interview.config.answerTimeLimit}
              questionStartedAt={state.questionStartedAt}
              onActivity={setActivity}
            />
          </div>
        </section>

        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] border-l border-line lg:block" aria-label="Interview notes">
          <InterviewNotes questions={interview.questions} liveFeedback={interview.config.liveFeedback} copy={copy} />
        </aside>
      </main>

      {/* mobile notes drawer */}
      <AnimatePresence>
        {notesOpen && (
          <motion.div className="fixed inset-0 z-40 bg-black/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNotesOpen(false)}>
            <motion.div
              role="dialog"
              aria-label="Interview notes"
              className="absolute inset-x-0 bottom-0 h-[75dvh] rounded-t-3xl border-t border-line-strong bg-surface"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" aria-label="Close notes" onClick={() => setNotesOpen(false)} className="absolute top-3 right-3 z-10 p-2 text-muted hover:text-ink">
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
          engineLabel={engineLabel}
          voiceInput={isSpeechRecognitionSupported()}
          voiceOutput={interview.config.voiceEnabled && isSpeechSynthesisSupported()}
          onDone={actions.onIntroDone}
        />
      )}
      {state.phase === "COMPLETED" && <CompletionScreen interview={interview} />}

      <Dialog
        open={confirmEnd}
        title="End interview?"
        onClose={() => setConfirmEnd(false)}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setConfirmEnd(false)}>
              Keep going
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setConfirmEnd(false);
                actions.endInterview();
              }}
            >
              End now
            </Button>
          </>
        }
      >
        {answeredCount > 0
          ? `Are you sure? You've answered ${answeredCount} of ${interview.config.questionLimit} questions. Your report will be based on those answers.`
          : "Are you sure? You haven't answered any questions yet, so no report will be created."}
      </Dialog>
    </div>
  );
}
