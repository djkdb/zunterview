import { hasDocuments } from "../../shared/documents";
import { roleContextFor } from "../../shared/roles";
import type { InterviewConfig } from "../types/interview";

/** What an event may say about an interview: the setup, never what was answered. */
export function eventProps(c: InterviewConfig) {
  return { archetype: roleContextFor(c).archetype, questions: c.questionLimit, difficulty: c.difficulty, documents: hasDocuments(c.documents), company: Boolean(c.companyId), language: c.language, notebook: Boolean(c.preset?.length) };
}
