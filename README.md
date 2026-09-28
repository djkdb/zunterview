# INTERVIEW//AI

> AI가 질문만 하는 것이 아니라, 내 답변을 듣고 다시 파고든다.
> *Your interviewer adapts to your answers.*

브라우저에서 **실제 한국 기업 면접장**처럼 꾸민 모의면접실에서, AI 면접관 3인(인사팀 책임 · 면접위원장 · 실무 면접관)과 다대일 면접을 진행하는 웹앱입니다.

```
질문 → 답변 → AI 분석 → 꼬리질문(Follow-up) → 다시 답변 → 다음 질문 → … → 종합 리포트
```

- **면접장 연출**: 대기실(모의면접 수험표) → 호명("지원번호 ○○번 지원자님, 입실해 주세요") → 문이 열리며 입실 → 면접위원장의 인사로 시작. 면접실에는 긴 책상, 명패, 생수병, 벽시계(실제 시간), 회사 스크린이 있고, 질문 유형에 따라 면접관이 번갈아 질문합니다(기술 질문은 실무 면접관, 성찰·인성은 인사 면접관). 질문 중인 면접관은 입이 움직이고, 답변 검토 중에는 모두 평가표에 필기합니다.
- **기업별 모의면접 (30곳, 예상 질문 698개)**: 대기업(삼성전자·SK하이닉스·현대자동차·LG전자·포스코·삼성SDS), IT·플랫폼(네이버·카카오·쿠팡·토스·우아한형제들·LG CNS), 금융·통신·식품(신한·KB국민·하나·NH농협은행·KT·CJ제일제당), 공기업(한전·수자원공사·가스공사·도로공사·코레일·인천공항공사), 공공기관(건보공단·국민연금·LH·심평원·산업은행·근로복지공단). 기업마다 인재상, 면접 전형, 준비 팁, 직무 트랙별 예상 질문과 출처를 제공하고, 선택한 기업의 질문으로 면접관이 질문합니다. 질문에는 "기출 기반"(공개 면접 후기에 보고된 질문을 재구성) / "인재상 기반"(공식 자료에서 도출) 표시가 붙습니다.
- **꼬리질문**: 답변에서 실제로 말한 표현(예: “성능 문제”)을 집어 다시 묻습니다. 화면에 *“답변에서 이어서 ‘성능 문제’”* 와 *이 질문을 한 이유* 가 함께 표시됩니다.
- **답변 분석**: Relevance · Logic · Specificity · Structure · Communication · Confidence 6개 항목 + STAR + 근거 인용 + 개선 예시
- **모의면접 평가표**: 인적사항 표, 종합 점수·등급(S~D), 항목별 평가표 + 레이더 차트, 면접위원 종합 의견, 문항별 평가(STAR ○△×), "모의면접 · 연습용" 도장, 평가표 다운로드(HTML), 결과 카드 공유(PNG)
- **음성**: 질문 음성 출력(speechSynthesis), 답변 음성 입력(Web Speech API) — 미지원 브라우저는 자동으로 텍스트 모드
- **MOCK MODE**: API 키 없이도 전체 흐름이 동작합니다 (답변을 실제로 읽고 꼬리질문을 만드는 규칙 기반 면접관)

---

## 빠른 시작

```bash
npm install
npm run dev          # http://localhost:5173  (API 서버 :8787 + Vite, /api 프록시)
```

API 키가 없으면 자동으로 **MOCK MODE** 로 실행됩니다.

### 실제 AI(Claude) 연결

```bash
cp .env.example .env
# .env 에 ANTHROPIC_API_KEY=... 입력
npm run dev
```

상단 배지가 **AI MODE** 로 바뀝니다. 키는 서버(`server/`)에서만 읽으며 브라우저 번들에는 절대 포함되지 않습니다.

| 변수 | 위치 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 서버 전용 | 없으면 MOCK MODE |
| `AI_MODEL` | 서버 전용 | 기본 `claude-opus-5` |
| `AI_EFFORT` | 서버 전용 | 기본 `low` (면접 턴 응답 속도 우선). `medium`/`high` 로 올릴 수 있음 |
| `AI_FALLBACKS` | 서버 전용 | 기본 켜짐 — 모델이 요청을 거절(refusal)하면 서버 측에서 권장 모델로 재시도. `off` 로 끔 |
| `RATE_LIMIT_PER_MINUTE` | 서버 전용 | IP당 AI 호출 제한 (기본 40) |
| `VITE_AI_MODE` | 클라이언트 | `auto`(기본) / `mock`(항상 목업) |
| `VITE_API_BASE_URL` | 클라이언트 | API 서버 주소. 비우면 같은 origin |

URL로 강제 목업: `/?mode=mock`

### 면접관 목소리 (Fish Audio, 선택)

기본은 브라우저 내장 음성(Web Speech)이라 면접관 3명의 목소리가 높낮이·속도만 다릅니다. [Fish Audio](https://fish.audio) 키를 넣으면 면접관마다 **서로 다른 실제 음성 모델**로 말합니다.

```bash
# .env (서버 전용 — 브라우저로 전달되지 않음)
FISH_AUDIO_API_KEY=...
FISH_VOICE_CENTER=<면접위원장 음성 모델 ID>
FISH_VOICE_LEFT=<인사팀 면접관>
FISH_VOICE_RIGHT=<실무 면접관>
FISH_VOICE_STAFF=<호명하는 안내 직원>   # 선택
```

- 음성 모델 ID는 fish.audio에서 원하는 목소리 페이지 URL의 ID(또는 직접 클론한 모델 ID)입니다.
- 브라우저 → `/api/tts` → Fish Audio 순서로 호출하며, 최근 음성은 서버에 캐시되어 "질문 다시 듣기"는 추가 비용이 없습니다.
- Fish Audio 호출이 실패(네트워크·잔액 부족 등)하면 자동으로 브라우저 음성으로 이어서 말합니다.

### 프로덕션

```bash
npm run build        # typecheck + vite build
npm start            # :8787 에서 dist/ + /api 를 함께 서빙
```

## 기업별 데이터

- 원자료: `research/raw/*.json` — 공개 면접 후기(잡코리아, 링커리어, 자소설닷컴, 위포트 등)와 각 기업·기관 공식 채용/인재상 페이지를 조사해 질문을 **직접 재작성**한 것 (원문 복사 없음). 기업마다 출처 URL 포함.
- 검수 규칙: `research/curation.json` — 모의면접 컨설팅/유료 자료에서만 확인된 질문은 제외하거나 "인재상 기반"으로 재분류, 유료 자료 사이트는 출처에서 제외.
- 생성: `node scripts/build-company-data.mjs` → `shared/data/companies.ts` (로드 시 zod 검증).
- 한계: 일부 기업은 최근 후기가 적어 2015~2022년 질문이 섞여 있고, 공식 페이지가 열리지 않은 경우 인재상을 뉴스·2차 자료로 보완했습니다. 실제 면접과 다를 수 있으며 해당 기업·기관과 무관합니다.

## 스크립트

| 명령 | 내용 |
|---|---|
| `npm run dev` | API 서버(tsx watch) + Vite |
| `npm run lint` | ESLint (react-hooks 포함) |
| `npm run typecheck` | 클라이언트 + 서버 `tsc --noEmit` |
| `npm test` | Vitest (상태 머신, Mock 면접관, 환각 방지 가드) |
| `npm run build` | typecheck → 프로덕션 빌드 |

## 디버그 모드

`/?debug=true` — 우측 하단 패널:
MODE, AI PROVIDER, INTERVIEW STATE, QUESTION INDEX, CURRENT QUESTION, CURRENT SCORE, TOKEN STATUS
+ Next Question · Trigger Follow-up · Mock Excellent/Poor Answer · Complete Interview · Reset · Clear Local Data · Test Voice · Test Error

---

## 아키텍처

```
shared/                 브라우저·서버 공통 계약
  schemas.ts            zod 스키마 (요청 검증 + AI 구조화 출력 포맷 + 클라이언트 재검증)
  sanitize.ts           점수 clamp, 근거 인용 검증(답변에 없는 인용 제거), 길이 제한
  labels.ts
server/                 API 레이어 (비밀키 보관)
  index.ts              node:http — /api/health, /api/ai/{question,follow-up,analyze,report}, 정적 서빙
  claude.ts             Anthropic SDK · beta.messages.parse + JSON schema 구조화 출력
  prompts/              questionPrompt · followupPrompt · analysisPrompt · reportPrompt · common
src/
  services/ai/          AIProvider 인터페이스 · RealAIProvider · MockAIProvider · providerFactory
  services/speech/      speechRecognition · speechSynthesis
  state/                interviewMachine.ts — 단일 reducer 상태 머신
  hooks/                useInterview(오케스트레이터) · useTimer · useVoiceInput · useMediaQuery
  components/           InterviewRoom(면접실 SVG) · QuestionPanel · AnswerInput · InterviewNotes
                        IntroSequence(대기실·호명·입실) · ScoreRing · ScoreChart · Stamp · FeedbackCard · DebugPanel …
  config/               panel(면접관 3인·좌석 배정) · labelsKo(한국어 라벨·등급) · copy · options
  pages/                Landing · Setup · Interview · Result · History
  utils/                scoring · context · fingerprint · policy · storage · report · shareCard
```

### 상태 머신

```
IDLE → SETUP → INTRO → ASKING → LISTENING → ANALYZING → FOLLOW_UP | NEXT_QUESTION → ASKING …
                                                       → COMPLETED → RESULT
ERROR 는 INTRO/ANALYZING 을 중단시키고, RETRY 시 중단된 단계로 복귀
```

화면·면접관 애니메이션·입력 활성화가 모두 `phase` 하나에서 파생됩니다.

### 한 턴의 흐름 (`useInterview.processAnswer`)

1. 답변 제출 → `ANALYZING` (답변 제출 → AI 생각 중 → 답변 분석 중 단계 표시, 제출한 답변은 화면에 유지)
2. **병렬 호출**: `analyzeAnswer` ‖ (`generateFollowUp` 또는 `generateQuestion`)
   - 꼬리질문 허용 여부는 `utils/policy.ts` (난이도별 최대 깊이, 전체의 50% 이하, 남은 질문 수)
3. 면접관 리액션(“좋습니다. 그 부분을 조금 더 깊게…”) → `FOLLOW_UP` / `NEXT_QUESTION`
4. 새 질문 등장 + 음성 출력 → `LISTENING`
5. 마지막 질문이면 `COMPLETED` → 최종 리포트 → `RESULT` → localStorage 저장

### AI 응답 안전장치

- 모든 AI 출력은 **JSON schema 구조화 출력** → 서버에서 1차 파싱, 브라우저에서 zod로 2차 검증
- 파싱 실패/타임아웃/네트워크 오류 → 1회 자동 재시도 → “Interview paused” 패널 (**Retry** / **Continue in Mock Mode**)
- 최종 리포트 생성 실패는 결과 화면을 막지 않고 Mock 리포트로 자동 대체
- **환각 방지**: 프롬프트에 “답변에 없는 사실 금지” 규칙 + `evidence`/`anchor` 인용이 실제 답변에 없으면 제거. 개선 예시는 `[괄호 placeholder]` 사용 및 “예시일 뿐” 표기
- **중복 질문 방지**: 이미 한 질문 목록을 프롬프트에 전달 + 문자 bigram 유사도(≥0.6) 검사 → 재생성 → 그래도 중복이면 Mock 질문 뱅크
- **컨텍스트 관리**: 최근 4개 턴만 전문 전송, 나머지는 질문 목록만 전송
- 점수(종합/항목별)는 질문별 분석에서 결정적으로 계산하고, AI는 서술만 작성

### 보안·개인정보

- API 키는 서버 환경변수로만 사용. 프롬프트도 서버에 있어 브라우저는 구조화된 면접 데이터만 전송 (임의 프롬프트 프록시로 악용 불가)
- 요청 본문 zod 검증, 64KB 제한, IP당 분당 호출 제한
- 서버는 답변 내용을 로그/저장하지 않음 (경로·상태·토큰 수만 로그)
- 마이크는 **Record 버튼을 눌렀을 때만** 활성화. 카메라는 사용하지 않음 (`Permissions-Policy: camera=()`)
- 면접 기록은 이 브라우저의 localStorage에만 저장. 공유 카드는 직무·점수·강점만 포함 (답변 미포함)

---

## QA 결과

Chromium(Playwright)으로 실제 앱을 구동해 확인한 시나리오:

| # | 시나리오 | 결과 |
|---|---|---|
| 01–03 | 새 면접 생성 · 직무/유형/길이/JD 설정 · SYSTEM CHECK → 3·2·1 → 시작 | ✅ |
| 04–06 | 텍스트 답변 → 분석 → 꼬리질문 (“팀 프로젝트에서 성능 문제를 해결했습니다.” → “그 성능 문제의 원인은 구체적으로 어떻게 찾으셨나요?” → “로그와 profiling을 사용했습니다.” → “로그, profiling 중 가장 효과적이었던 방법 하나를 골라 설명해주세요.”) | ✅ |
| 07–09 | 다음 질문 · 5문항 완료 · 결과(점수 링/레이더/질문 리뷰) · 리포트 다운로드 | ✅ |
| 10 | localStorage 기록 저장 · 히스토리 · 이전 면접 비교 | ✅ |
| 11 | 음성 입력: 지원 감지 및 텍스트 fallback 안내 (실제 마이크 인식은 헤드리스 환경에서 미검증) | ⚠️ 부분 |
| 12 | API 실패: 디버그 Test Error → 일시정지 패널 → Retry 복구 / 깨진 JSON 응답 → Continue in Mock Mode | ✅ |
| 13 | Mock Mode 전체 흐름 | ✅ |
| 14 | 모바일 375 / 390 / 430px — 가로 스크롤 없음 | ✅ |
| 15 | lint · typecheck · unit test(25) · build | ✅ |

AI MODE는 로컬 가짜 Messages API로 서버 요청 형태(모델, 구조화 출력, fallback 헤더)와 브라우저 흐름(꼬리질문 표시, 환각 인용 제거)을 검증했습니다. 실제 Claude 응답 품질은 `ANTHROPIC_API_KEY` 를 넣고 확인이 필요합니다.

> AI-generated mock interview feedback. Scores are for practice purposes only.
