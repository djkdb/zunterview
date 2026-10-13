import { buildNotebook, practiceQuestions, REVIEW_BELOW, sortForReview, sourceInterviewId } from "./notebook";
import type { PracticeState } from "./plan";
import { buildStoryMap, gapQuestion } from "./storyMap";
import { loadFullInterviews, loadIntroAttempts, loadScripts } from "./storage";
import type { PresetQuestion } from "../types/interview";

/** Everything the plan needs to know, read from this browser. */
export function practiceState(): PracticeState & { weak: PresetQuestion[]; gaps: PresetQuestion[]; fromInterviewId: string | null; position: string } {
  const interviews = loadFullInterviews();
  const notes = sortForReview(buildNotebook(interviews, loadScripts()));
  const weakNotes = notes.filter((n) => n.best !== null && n.best < REVIEW_BELOW);
  const map = buildStoryMap(interviews);
  const position = interviews[0]?.config.position ?? "";
  const gapKinds = [...map.missing, ...map.weak];
  return {
    interviews,
    intros: loadIntroAttempts(),
    scripts: Object.values(loadScripts()),
    weakQuestions: weakNotes.length,
    gapKinds: interviews.length ? gapKinds.length : 0,
    weak: practiceQuestions(weakNotes),
    gaps: gapKinds.slice(0, 5).map((c) => gapQuestion(c, position)),
    fromInterviewId: sourceInterviewId(weakNotes) ?? interviews[0]?.id ?? null,
    position,
  };
}
