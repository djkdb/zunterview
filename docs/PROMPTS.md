# 프롬프트 엔지니어링 과정

이 프로젝트에는 프롬프트가 두 층 있습니다.

1. **개발 프롬프트**: 개발자가 Claude Code에게 준 지시. 무엇을 어떻게 만들지 정합니다.
2. **서비스 프롬프트**: 앱 안의 AI 면접관(Claude)에게 서버가 보내는 지시(`server/prompts/`). 면접관이 무엇을 묻고 어떻게 채점할지 정합니다.

프롬프트를 바꾸면 이 문서에 `무엇이 문제였나 → 무엇을 바꿨나 → 결과` 순서로 추가합니다.

---

## 1. 개발 프롬프트: Claude Code에게 준 지시의 변화

| 단계 | 지시(요지) | 결과 | 배운 점 |
|---|---|---|---|
| 처음 | "AI 모의면접 웹앱 만들어 줘. 꼬리질문, 음성, 평가 리포트" | 동작하는 첫 버전(7ebb125) | 기능 목록만 주면 일반적인 결과가 나온다 |
| 연출 | "한국 기업 면접장처럼", "더 진지하게 다시 그려줘", 실사 포즈 시트와 회의실 사진 제공 | 면접장 연출, 실사 면접관(8989932, d8eb95a, fa5cb5b) | 말보다 참고 이미지가 훨씬 정확하다 |
| 범위 | "개발자만이 아니라 전 직무" | 256개 직무, 질문 7,989개(7a89d7a) | 데이터 수집과 검증까지 파이프라인으로 시켜야 품질이 유지된다 |
| 검증 방식 | "사용자 입장에서 시뮬레이션 하며 고도화" | 답변이 아닌 답변 처리(474455f) | "개선해 줘"보다 "사용자처럼 써 봐"가 구체적인 버그를 찾는다 |
| 검증 방식 | "5명의 페르소나 잡고 실제로 시뮬레이션 해봐" | 꼬리질문이 0개인 치명적 버그 발견(f83bcae), 9가지 수정(e4f8d84) | 서로 다른 사용자(간호, 회계, 비전공, 영어, 짧은 답)를 정해 주면 테스트 범위가 넓어진다 |
| 검증 방식 | "한 번 CLI로 돌려봐 한 사람만", "소프트웨어학부 졸업생 신입으로" | 한 명을 끝까지 따라가며 질문 하나하나를 검토(4761170, 4f0d089) | 넓게 한 번, 깊게 한 번을 번갈아 시키는 것이 효과적이었다 |
| 정책 | "욕하거나 무례하면 면접관이 화내고 종료", "ㅇㅇ, ㅅㅂ, 반말도" | 면접 중단 규칙(930df2f, 2109a25) | 예시 단어를 직접 주면 경계가 분명해진다 |
| 비용 | "면접 한 번에 API 비용이 얼마야?" | 프롬프트 캐싱, 호출별 비용 로그(b43e83d) | 비용을 물으면 구조 개선(캐싱)까지 이어진다 |
| 기능 | "이력서·자소서 있는 버전, 없는 버전 나누어서" | 서류 기반 면접, 3단계 접수(b80a5ef) | |
| 품질 | "AI 티 없애는 스킬들 설치 후 UI/UX 고도화" | frontend-design, humanizer 스킬 설치 후 그 기준으로 정리(5e0fd8c) | 취향을 말로 설명하기보다 검증된 지침(스킬)을 주는 것이 일관됐다 |
| 기록 | "트러블슈팅 내용은 따로 기록해" | `docs/TROUBLESHOOTING.md`, `CLAUDE.md` 규칙 | 기록 규칙을 저장소에 두면 다음 세션도 따른다 |
| 대회 | 대회 공지(발표 양식, 심사 기준)를 그대로 주고 "이 관점에서 고도화" | 발표 양식별 문서 세트(`docs/`) | 평가 기준을 그대로 주면 산출물이 그 기준에 맞춰 정리된다 |
| 조사 | "이런 류의 서비스 있어? 리서치 해봐" | 경쟁 서비스 조사(`docs/COMPETITORS.md`). 가장 비슷한 사람인 AI 모의면접과 겹치는 부분을 확인하고 차별점을 다시 정함 | 만들기 전에 시장을 조사했어야 했다. 조사 결과 "꼬리질문"만으로는 독창성이 되지 않았다 |

## 2. 서비스 프롬프트: AI 면접관 지시의 변화

### v1. 범용 면접관 (7ebb125)

```text
You are Alex, an experienced interviewer running a realistic mock interview.
Questions are short and spoken aloud: one idea per question ...
Grounding rules: Use only information the candidate actually stated ...
```

- 구조: 시스템 프롬프트에 면접관 성격, 사용자 메시지에 대화 기록. 응답은 JSON 스키마로 강제(structured output).
- 문제: 직무 정보가 직무명 한 줄뿐이었다. 회계 지원자에게 개발자 질문이 나왔고, 질문이 어느 회사에서나 나올 법한 일반 질문이었다.

### v2. 직무 프로필과 면접 설계도 (7a89d7a)

- 바꾼 것: 직무 프로필(핵심 역량, 업무, 주제), 직무군별 **면접 설계도**(질문 비율, 순서, 꼬리질문 경로, 압박 질문), 질문 은행에서 **다음 단계에 맞는 후보만 골라** 넣었다. 은행 전체를 넣지 않는다.
- 예: 회계는 `업무 → 기준 → 오류 → 처리 → 결과`, 마케팅은 `목표 → 타깃 → 채널 → KPI → 결과` 순서로 파고들게 한다.
- 결과: 회계·간호 지원자에게 개발 질문이 나오지 않는다(테스트로 확인: `prompts.test.ts`).

### v3. 시뮬레이션에서 나온 규칙, 캐싱 (b43e83d)

시뮬레이션에서 목 면접관이 저지른 실수를 AI 프롬프트 규칙으로 옮겼습니다.

```text
The room (critical):
- The panel has no résumé, cover letter, portfolio, code editor or whiteboard ...
- The candidate's self-introduction is asked once ...

Only ask "how did you …" about things the candidate said they actually did.
A plan, a wish or a hypothetical is not an experience — test it instead or move on.
A word used in another sense is not a topic ("performance marketer" is not a performance problem).
```

- 비용: 시스템 프롬프트를 면접 내내 똑같이 유지하고(바뀌는 정보는 사용자 메시지로 이동) `cache_control`로 캐시했다. 두 번째 호출부터 시스템 프롬프트는 캐시에서 읽는다. 테스트가 "턴이 바뀌어도 시스템 프롬프트가 같은지" 확인한다.
- 안전장치: AI가 만든 질문도 반복이거나 면접실에서 불가능한 질문이면 코드(`unaskable`)가 거르고 다시 만든다. 프롬프트만 믿지 않는다.
- 근거 고정: 분석 결과의 "근거 인용"은 답변에 실제로 있는 문장만 남긴다(`sanitizeAnalysis`).

### v4. 서류 기반 면접 (b80a5ef)

```text
This is a document-based interview: about half of the main questions should verify a specific claim
from these documents — quote the candidate's own words briefly ... and ask for what the document
doesn't show: how it was measured, their own part, why that choice, what went wrong.
When an answer contradicts the documents, ask about the gap politely.
```

- 서류는 면접 중 바뀌지 않으므로 캐시되는 시스템 프롬프트에 넣었다.
- 서류가 있을 때만 이력서 언급을 허용하도록 면접실 규칙을 두 가지로 나눴다.

### v5. 사람 같은 말투 (5e0fd8c)

```text
Sound like a real interviewer and evaluator, not a chatbot:
- No em dashes (—), arrows (→) or exclamation marks ...
- No staged contrasts ("단순히 ~가 아니라 ~", "~뿐만 아니라 ~도") ...
- Avoid stock evaluation words: 핵심, 효과적, 인사이트, 포인트, 돋보였습니다 ...
- Name the specific thing from the answer instead ...
```

- 근거: humanizer 스킬(Wikipedia "Signs of AI writing" 기반)의 패턴을 한국어 면접 상황에 맞게 옮겼다.
- 프롬프트만으로는 줄표가 남을 수 있어서 서버가 응답의 줄표를 한 번 더 지운다(`shared/sanitize.ts`).

## 3. 정리: 프롬프트를 고친 방법

1. **재현**: 페르소나 시뮬레이션이나 CLI 면접으로 이상한 질문을 실제로 띄운다.
2. **원인 분류**: 프롬프트가 모호해서인지(규칙 추가), 정보가 부족해서인지(직무 프로필 추가), 모델이 규칙을 어기는지(코드로 검증)를 나눈다.
3. **목 면접관과 AI에 같은 규칙 적용**: 목 면접관에서 고친 규칙은 AI 프롬프트에도 옮긴다.
4. **테스트로 고정**: 프롬프트에 규칙이 들어갔는지, 시스템 프롬프트가 캐시 가능한지 테스트한다.
