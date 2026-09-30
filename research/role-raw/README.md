# Role question research — raw data format

Raw, reviewable research files for the **role (직무) interview mode**.
`scripts/build-role-data.ts` validates, dedupes and compiles them into
`shared/data/roles/*` — never edit the generated files by hand.

```
research/role-raw/
  taxonomy.json      domain → family → role skeleton (ids are fixed)
  common.json        questions for every role (scope "common")
  b01*.json … b12*.json   role profiles + family/role questions, one batch of domains each
research/role-curation.json   manual review applied on top (drop / reclassify)
```

## Honesty rules (non-negotiable)

1. **Never present generated questions as real past questions (기출).** Every question
   carries a `basis`:
   | basis | meaning | sourceType |
   |---|---|---|
   | `공개후기` | paraphrased from a public interview review you actually opened | `interview_review` |
   | `공식자료` | derived from an official page: recruiting page, job description, NCS | `official_recruitment`, `job_description`, `ncs` |
   | `공고기반` | derived from a public job posting's requirements | `job_description` |
   | `직무기반` | written from the role's typical work (practice question, **not** a reported question) | `role_research` |
   | `일반면접` | general interview question used across roles | `role_research` |
2. A question may only reference a source (`src`) you actually opened and read. If you only saw a
   search-result snippet, don't cite it.
3. **Paraphrase** — never copy a review sentence verbatim. Rewrite it as a natural practice question.
4. No paid material (해피캠퍼스, 레포트월드, 유료 리포트, 유료 강의), nothing behind a login, no bypassing
   robots/terms. Don't cite mock-interview prep vendors' "예상 질문" lists as `공개후기`.
5. No company names in role questions (company-specific questions belong to company mode).
6. No time-sensitive facts that could be wrong (specific law amendment dates, rates, figures).
   Well-known standards are fine to name (K-IFRS, GMP, HACCP, 산업안전보건법, ISO 9001, NCS).

## Question style

- Natural spoken Korean an interviewer at a Korean organization would actually say, polite (존댓말):
  "~말씀해 주세요.", "~어떻게 하시겠어요?", "~무엇부터 확인하시겠습니까?"
- **Not exam-style.** Bad: "재무회계의 전문성을 설명하십시오." Good: "결산 과정에서 숫자가 맞지 않는 상황을 발견하면 어떤 순서로 확인하시겠어요?"
- One idea per question, no multi-part questions, no numbering, no answer hints.
- Length: 15–90 characters ideally, hard max 120. End with `?` (or `.` for "~말씀해 주세요.").
- The question must be answerable and checkable: it asks for an experience, a judgment with reasons,
  a procedure, or a concrete view — not trivia with one memorized word as the answer.
- Must be about **this role's real work**. An accounting question must never mention React/API/Docker;
  a nurse question must never mention SQL/CI/CD. Technical (`technical`) questions only for
  engineering / IT / science roles.
- No near-duplicates: "팀원과 갈등이 생겼던 경험" and "동료와 의견 충돌이 있었던 사례" are the same question.

## File format (batch files)

```jsonc
{
  "batch": "b04",
  "sources": [
    // every source you cite; ids are local to the file
    { "id": "s1", "title": "NCS 학습모듈 — 구매조달", "url": "https://www.ncs.go.kr/...", "type": "ncs", "year": 2024 }
    // type: interview_review | official_recruitment | job_description | ncs | role_research | other_public
  ],
  "profiles": [
    {
      "id": "purchaser",                       // must match taxonomy.json
      "aliases": ["구매", "구매 담당자", "구매팀", "바잉", "Purchasing", "Procurement Specialist", "구매관리"],
      "skills": ["원가 분석", "협력사 평가", "협상", "계약 관리", "ERP(SAP MM)"],
      "responsibilities": ["자재·부품 구매 및 발주", "견적 비교와 단가 협상", "협력사 발굴·평가", "납기·품질 이슈 대응"],
      "keywords": ["단가", "견적", "발주", "협력사", "납기", "원가", "계약", "소싱", "리드타임", "재고", "SRM", "negotiation"],
      "topics": {
        "role": ["단가 협상", "협력사 평가", "원가 절감", "납기 관리", "구매 리스크"],     // core work themes (ko)
        "scenario": ["핵심 부품 공급 중단", "현업의 긴급 발주 요청", "협력사 단가 인상 통보"],  // realistic situations
        "result": ["원가 절감률", "납기 준수율", "협력사 품질 지표"],                         // outcomes to verify
        "en": ["price negotiation", "supplier evaluation", "cost reduction", "delivery management"]
      },
      "sources": ["s1"]                          // optional, ids from "sources"
    }
  ],
  "questions": [
    {
      "text": "핵심 부품 협력사가 갑자기 단가를 15% 인상하겠다고 통보하면 어떻게 대응하시겠어요?",
      "scope": "role:purchaser",               // role:<roleId> | family:<familyId> | domain:<domainId>
      "category": "상황대처",
      "type": "situational",
      "difficulty": "normal",                  // easy | normal | hard
      "levels": ["junior", "mid"],             // optional: entry | junior | mid | senior (omit = all)
      "basis": "직무기반",                      // see table above
      "src": "s1",                             // optional; required for 공개후기/공식자료/공고기반
      "confidence": "medium"                   // high | medium | low  (default medium)
    }
  ]
}
```

`common.json` uses `"scope": "common"`, adds an `"en"` English version to every question, and may use `{role}` for the role name, with an optional particle:
`{role}`, `{role:을/를}`, `{role:이/가}`, `{role:은/는}`, `{role:와/과}` (e.g. "{role} 직무를 선택한 이유는 무엇인가요?").
Role/family/domain questions must not use placeholders.

### categories (`category`)

자기소개, 지원동기, 직무이해, 기업이해, 경험, 팀워크, 갈등, 리더십, 실패, 성공, 문제해결, 의사결정,
커뮤니케이션, 상황대처, 윤리, 가치관, 강점, 약점, 성장, 성과, 직무전문성, 실무, 도구, 기술, 산업, 시장,
경쟁, 고객, 데이터, 전략, 사례, PT, 토론, 압박, 조직적합성, 기타

### types (`type`)

| type | use for |
|---|---|
| opening | self-introduction / background (mostly common) |
| motivation | why this role / field / industry |
| role_understanding | what the role really involves, key competencies, hard parts of the job |
| company_understanding | (company mode only — don't use in role files) |
| behavioral | past behavior showing a competency (teamwork, conflict, ownership…) in the role's context |
| experience | "tell me about a time you did X" for concrete role-related work |
| deep_dive | digging into one experience (rare in the bank; mostly follow-ups) |
| situational | hypothetical: "~한 상황이라면 어떻게 하시겠어요?" |
| role_specific | practical job knowledge & judgment for non-coding work (결산 절차, 간호 우선순위, 채용 평가 기준…) |
| technical | technical knowledge — **only** engineering / IT / science roles |
| case | a business/work case to reason through ("매출이 20% 줄었다면 어떤 순서로 원인을 찾으시겠어요?") |
| numerical | numbers / estimation / metric interpretation |
| analytical | analysis of causes, data, trade-offs |
| industry | the industry / market / trends — ask for the candidate's view, not facts |
| leadership | leading, influencing, mentoring |
| communication | explaining, persuading, stakeholder communication |
| ethics | integrity, compliance, fairness, safety dilemmas |
| challenge | pressure / counter-argument ("그 판단이 틀렸다면요?") — usually hard |
| reflection | lessons, weaknesses, growth, values |
| result | verifying outcomes and impact |
| pt | a PT (presentation) interview prompt |
| debate | a discussion-interview topic with two defensible sides |

## Quotas per batch

- Each **role**: 14–20 role-level questions — at least 5 `role_specific` (or `technical` for engineering/IT/science),
  3 `situational`, 2 of `case`/`analytical`/`numerical`, 2 `experience`, 1 `role_understanding`,
  1 `motivation`, 1 hard `challenge`. Mix easy/normal/hard (roughly 20/55/25).
- Each **family**: 20–30 family-level questions shared by its roles — `role_understanding` 4, `behavioral` 5
  (competencies in this field's context), `situational` 5, `experience` 3, `industry` 3, `ethics` 2,
  `reflection` 2, `result` 2, `pt`/`debate` 1–2.
- Include `levels` for questions clearly meant for seniors (조직·전략·리스크·리더십) or for new graduates
  (학교 경험·실습·기본 개념).
- Aim for ≥10% of questions with a real source (`공개후기`/`공식자료`), the rest `직무기반`.
