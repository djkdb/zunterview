import { hasDocuments } from "../../shared/documents";
import type { DocumentKind, Interview } from "../types/interview";

const KO: Record<DocumentKind, string> = { coverLetter: "자기소개서", resume: "이력서" };

/** "자기소개서·이력서 기반" / "서류 없음 (직무 기반)" — works for live and saved (stripped) interviews. */
export function documentsLabel(i: Interview): string {
  const d = i.config.documents;
  const used: DocumentKind[] = hasDocuments(d) ? (["coverLetter", "resume"] as const).filter((k) => d[k].trim()) : (i.usedDocuments ?? []);
  if (i.config.preset?.length) return `답변 노트에서 고른 질문 ${i.config.preset.length}개`;
  return used.length ? `${used.map((k) => KO[k]).join("·")} 기반` : "서류 없음 (직무 기반)";
}
