# INTERVIEW//AI

> AI가 질문만 하는 것이 아니라, 내 답변을 듣고 다시 파고든다.
> *Your interviewer adapts to your answers.*

브라우저에서 **실제 한국 기업 면접장**처럼 꾸민 모의면접실에서, AI 면접관 3인(인사팀 책임 · 면접위원장 · 실무 면접관)과 다대일 면접을 진행하는 웹앱입니다. 개발자뿐 아니라 **회계·마케팅·영업·생산관리·간호·교사·공무원·연구원 등 전 직무**의 면접을 연습할 수 있습니다.

| 데이터 | 규모 |
|---|---|
| 직무 분류 | **51개 도메인 · 72개 직군 · 256개 직무** (Domain → Job family → Role) |
| 직무 질문 | **7,989개** (공통 383 + 도메인·직군·직무별 7,606) — 출처 738개, 모든 직무에 출처 있는 질문 6개 이상 |
| 기업·기관 | **54곳 · 질문 1,547개** (공개후기 기반 1,295) |

```
질문 → 답변 → AI 분석 → 꼬리질문(Follow-up) → 다시 답변 → 다음 질문 → … → 종합 리포트
```

- **면접장 연출**: 대기실(모의면접 수험표) → 호명("지원번호 ○○번 지원자님, 입실해 주세요") → 문이 열리며 입실 → 면접위원장의 인사로 시작. 면접실은 실사 회의실 사진에 면접관 3인의 포즈 사진을 합성한 장면이고(벽 스크린에 회사명, 책상 위 명패), 질문 유형에 따라 면접관이 번갈아 질문합니다(기술 질문은 실무 면접관, 성찰·인성은 인사 면접관). 면접관은 상태에 따라 포즈가 바뀝니다 — 질문할 때는 손짓하며 말하고, 답변을 들을 때는 생각하는 자세, 검토 중에는 평가표에 필기하거나 서류를 봅니다. 면접실 높이가 낮아져도 얼굴이 잘리지 않도록 보이는 영역을 조정합니다. `?panel=svg`로 일러스트 버전 면접실을 볼 수 있습니다.
- **전 직무 면접**: 직무를 검색(한글·영어·약어 — "FE", "HRD", "BM", "데이터 애널")하거나 분야 → 직무로 고르면, 그 직무의 프로필(핵심 역량·업무·주제)과 **면접 설계도(blueprint)**에 맞춰 질문이 구성됩니다. 회계는 결산·재무제표·내부통제, 마케팅은 캠페인·KPI·퍼널, 간호는 환자안전·상황대응, 생산관리는 계획·납기·품질을 묻고, 회계·간호 같은 직무에는 개발자 기술 질문이 나오지 않습니다. 목록에 없는 직무("방송 기술감독")도 가장 가까운 분야를 추정해 질문하고(AI 모드에서는 AI가 연습용 직무 프로필을 추론), "사무직"처럼 넓은 입력에는 "어떤 업무에 가까운가요?"로 되묻습니다.
- **기업별 모의면접 (54곳, 질문 1,547개)**: 대기업·IT·금융·공기업·공공기관·병원(서울대병원·서울아산병원) 등. 기업마다 인재상, 면접 전형, 준비 팁, 직무 트랙별 연습 질문과 출처를 제공합니다. 기업을 고르면 **기업 질문(지원동기·인재상·조직적합성) + 직무 질문 + JD**를 조합해 면접합니다. 기업 선택은 선택 사항입니다.
- **질문 출처 표시**: "공개후기 기반"(공개 면접 후기를 연습용으로 재구성) · "공식자료 기반"(인재상·직무기술서·NCS) · "공고기반" · "직무기반"(직무 특성으로 만든 연습 질문). 어떤 질문도 "기출"로 표시하지 않습니다.
- **꼬리질문**: 답변에서 실제로 말한 표현(예: “성능 문제”, “월 마감”, “환자”)을 집어 다시 묻고, 직무마다 파고드는 방향이 다릅니다 — 개발: 기술 선택→이유→트레이드오프→장애→결과 / 마케팅: 목표→타깃→채널→KPI→결과 / 회계: 업무→기준→오류→처리→결과 / 영업: 고객→니즈→제안→설득→결과 / 생산: 문제→원인→조치→재발방지→성과. 압박 난이도에서는 “그 결과가 정말 본인의 기여라고 어떻게 증명할 수 있나요?”처럼 직무에 맞게 날카로워집니다.
- **답변이 아닌 답변**: "질문이 이해가 안 돼요", "무슨 뜻이죠?"라고 하면 면접관이 질문의 의도와 답하는 방법을 설명한 뒤 같은 질문을 다시 합니다(문항당 한 번). **욕설·비하("ㅅㅂ", "ㅂㅅ", "시1발", "꺼지쇼", "어쩔티비", 답변 속 비속어)나 반말·채팅체 답변("ㅇㅇ", "ㅋㅋ", "몰라", "싫어", "그냥 했어", "제가 다 했음")을 하면 면접위원장이 그 자리에서 면접을 중단**하고, 평가표에 '면접 중단 · 부적절한 발언' 또는 '면접 중단 · 반말·무성의한 답변'이 표시됩니다. 따옴표 안의 인용("팀장님이 '빨리 해'라고…"), 글로 쓴 "~했다"체, "시발점"·"전원이 꺼지는"·"미친 듯이" 같은 말은 해당하지 않습니다. 의미 없는 입력(asdf, ...)·존댓말 거절("싫어요")은 AI를 부르지 않고 0~15점으로 처리하며 면접관이 짚고 넘어갑니다. 질문과 다른 내용으로 답하거나 앞선 답변을 그대로 반복하면 감점되고, 필요하면 "제가 여쭌 건 ~였는데요"라고 다시 묻습니다. 거의 답하지 않은 면접의 평가표는 강점을 지어내지 않습니다.
- **문항 수**: 5/10/15문항은 **메인 질문 수**입니다. 꼬리질문은 답변에 따라 추가되지만 난이도별 상한(메인 질문의 40~70%)이 있어 면접이 무한히 길어지지 않습니다.
- **답변 분석**: Relevance · Logic · Specificity · Structure · Communication · Confidence 6개 공통 항목 + **직무 관점 피드백**(회계: 정확성·기준 준수, 영업: 고객 지향성, 간호: 환자 안전·소통, 연구: 연구 방법론 …) + STAR + 근거 인용 + 개선 예시
- **모의면접 평가표**: 인적사항 표, 종합 점수·등급(S~D), 항목별 평가표 + 레이더 차트, 면접위원 종합 의견, 문항별 평가(STAR ○△×), "모의면접 · 연습용" 도장, 평가표 다운로드(HTML), 결과 카드 공유(PNG)
- **음성**: 질문 음성 출력(speechSynthesis), 답변 음성 입력(Web Speech API) — 미지원 브라우저는 자동으로 텍스트 모드
- **MOCK MODE**: API 키 없이도 전체 흐름이 동작합니다 (답변을 실제로 읽고 꼬리질문을 만드는 규칙 기반 면접관)
- **AI 모드 안정성·비용**: 시스템 프롬프트는 면접 내내 같아서 캐시되고(이후 호출은 캐시 읽기), 호출마다 바뀌는 내용(다음 질문 유형, 꼬리질문 깊이, 이전 답변)은 사용자 메시지로 보냅니다. AI 호출 하나가 실패하면(형식 오류·거절·시간 초과) 그 턴만 MOCK 면접관이 대신하고 면접은 이어지며, 세 번 연속 실패하면 MOCK으로 전환합니다. AI가 만든 질문도 반복·이력서 언급·라이브 코딩·두 번째 자기소개 같은 질문이면 걸러집니다(`shared/questionRules.ts`). 서버 로그에 호출마다 토큰·캐시·대략적 비용이 찍힙니다.

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
| `AI_MODEL` | 서버 전용 | 기본 `claude-sonnet-5-5` (빠르고 Opus의 절반 정도 비용). 가장 강한 모델은 `claude-opus-5-5` |
| `AI_EFFORT` | 서버 전용 | 기본 `low` (면접 턴 응답 속도 우선). `medium`/`high` 로 올릴 수 있음 |
| `AI_FALLBACKS` | 서버 전용 | 기본 켜짐 — 모델이 요청을 거절(refusal)하면 서버 측에서 권장 모델로 재시도. `off` 로 끔 |
| `RATE_LIMIT_PER_MINUTE` | 서버 전용 | IP당 AI 호출 제한 (기본 40) |
| `VITE_AI_MODE` | 클라이언트 | `auto`(기본) / `mock`(항상 목업) |
| `VITE_API_BASE_URL` | 클라이언트 | API 서버 주소. 비우면 같은 origin |

URL로 강제 목업: `/?mode=mock`

### 면접관 목소리 (Fish Audio, 선택)

기본은 브라우저 내장 음성(Web Speech)이라 면접관 3명의 목소리가 높낮이·속도만 다릅니다. [Fish Audio](https://fish.audio) 키를 넣으면 면접관마다 **서로 다른 실제 음성 모델**로 말합니다.

```bash
# 서버 환경변수 (배포 서비스의 Environment Variables 또는 로컬 .env — 브라우저로 전달되지 않음)
FISH_AUDIO_API_KEY=...        # 이것만 있으면 됩니다
```

- 면접관 목소리는 코드에 기본 지정돼 있어(`server/tts.ts`의 `BUILT_IN_VOICES` — 인사팀 여성, 면접위원장, 실무 면접관), 배포 환경에는 **API 키만** 넣으면 됩니다. 목소리 ID는 공개 모델 ID라 비밀이 아닙니다.
- 다른 목소리를 쓰려면 `FISH_VOICE_LEFT`·`FISH_VOICE_CENTER`·`FISH_VOICE_RIGHT`·`FISH_VOICE_STAFF`(자리별) 또는 `FISH_VOICE_DEFAULT`(전체)로 덮어씁니다. 값은 fish.audio 목소리 페이지 URL의 `modelId`입니다.
- 브라우저 → `/api/tts` → Fish Audio 순서로 호출하며, 최근 음성은 서버에 캐시되어 "질문 다시 듣기"는 추가 비용이 없습니다.
- API 호출은 fish.audio 웹 앱의 크레딧과 **별도인 API 크레딧**을 씁니다([Developers](https://fish.audio/app/developers)에서 충전). 크레딧이 없거나 키가 틀리면 서버 로그에 `[tts] failed (503) … Fish Audio 402: Insufficient API credit…`처럼 이유가 남고, 브라우저는 자동으로 내장 음성으로 읽습니다.
- Fish Audio 호출이 실패(네트워크·잔액 부족 등)하면 자동으로 브라우저 음성으로 이어서 말합니다.

### 프로덕션

```bash
npm run build        # typecheck + vite build
npm start            # :8787 에서 dist/ + /api 를 함께 서빙
```

## 질문 데이터 — 구축 방식과 한계

### 직무 데이터 (Role mode)

```
research/role-raw/taxonomy.json      도메인 → 직군 → 직무 골격 (id 고정)
research/role-raw/b01…b12.json       직무 프로필 + 직군·직무별 질문 (배치별 원자료, 출처 포함)
research/role-raw/s01…s11.json       출처 보강 1차: 출처가 부족했던 156개 직무의 출처 있는 질문만
research/role-raw/t01…t09.json       출처 보강 2차: 1인칭 면접 후기가 없던 직무 위주
research/role-raw/common.json        모든 직무 공통 질문 ({role} 치환, 영어 병기)
research/role-curation.json          수동 검수 (별칭, 출처 강등, 제외 질문)
        │  scripts/build-role-data.ts — 스키마·문체·출처 검증 → 직무 적합도 → 의미 중복 제거
        ▼
shared/data/roles.ts                 직무 색인(번들 포함, 검색·매칭용)
public/data/roles/profiles.json      직무 프로필      ┐
public/data/roles/common.json        공통 질문        ├ 필요할 때만 로드 (도메인별 분할)
public/data/roles/<domain>.json      도메인별 질문     ┘
```

- **출처 구분 (`basis`)**: `공개후기`(실제로 열어 본 1인칭 면접 후기를 재작성) 982 · `공식자료`(NCS 직무기술서, 기관·기업 직무소개, 협회·정부 직업정보) 770 · `공고기반`(공개 채용공고) 140 · `직무기반`(직무 특성으로 작성한 연습 질문) 5,770 · `일반면접` 327. 질문마다 `category`, `type`, `difficulty`, `levels`(경력), `confidence`, 출처가 있으면 `sourceTitle/sourceUrl/year`를 저장합니다.
- **원칙**: 원문을 복사하지 않고 연습용 문장으로 재작성, 유료 자료·로그인 필요 페이지·면접 컨설팅 업체의 "예상 질문" 목록은 사용하지 않음, 실제로 열어 보지 않은 페이지는 인용하지 않음, 차별적 질문(가족·결혼·외모·종교 등)과 특정 회사명이 든 질문은 제외. 1인칭 지원자 후기가 아닌 현직자 조언·멘토 답변, 다른 직무 지원자의 후기, "준비한 질문" 목록은 `공개후기`에서 `직무기반`으로 강등했습니다(`role-curation.json`의 `demoteReviewSources`). 같은 뜻의 질문이 겹치면 출처 있는 질문을 남깁니다.
- **품질 검증**: 자연스러운 존댓말·시험 문체 금지·길이, 역할 적합도 점수(0–1; 0.5 미만 제외 — 회계 질문에 React, 간호 질문에 CI/CD 같은 이질 용어 차단), 한 직무가 받을 수 있는 질문 집합 안에서 **의미 중복 제거**(문자 bigram + 동의어 정규화 + 질문 프레임: "팀원과 갈등이 생겼던 경험" ≈ "동료와 의견 충돌이 있었던 사례").
- **한계**: 대부분(약 76%)은 직무 특성으로 만든 연습 질문이며 실제 기출이 아닙니다. 모든 직무에 출처 있는 질문이 6개 이상 있고(중앙값 8), 256개 중 253개 직무에 1인칭 면접 후기가 있습니다. 내부회계·내부통제, 조달·계약, IE(산업공학)는 공개된 1인칭 후기를 찾지 못해 공식자료·채용공고로만 뒷받침됩니다. 교사·환경영향평가사 등은 채용 면접 대신 임용·자격시험 2차 면접 후기를 사용했습니다. 일부 후기는 오래됐고(2011~2016년), 채용공고 링크는 마감 후 사라질 수 있습니다. 직무 프로필은 일반적인 업무 설명이며 특정 기관의 실제 직무와 다를 수 있습니다.

### 기업 데이터 (Company mode)

- 원자료 `research/raw/*.json` → 검수 `research/curation.json` → `node scripts/build-company-data.mjs` → 기업 프로필 `shared/data/companies.ts` + 질문 `public/data/companies/<id>.json`(필요할 때 로드).
- 공개 면접 후기(잡코리아, 링커리어, 자소설닷컴, 위포트 등)와 각 기업·기관의 공식 채용·인재상 페이지를 조사해 질문을 직접 재작성했습니다. 기업마다 출처 URL을 포함합니다.
- 한계: 일부 기업은 최근 후기가 적어 과거 질문이 섞여 있고, 전형은 연도·부문별로 다를 수 있습니다. 해당 기업·기관과 무관한 연습용 자료입니다.

### 기업 데이터와 직무 데이터의 차이

| | 기업 모드 | 직무 모드 | 조합 (기업 + 직무 + JD) |
|---|---|---|---|
| 질문 | 기업별 공개후기·공식자료 | 직무별 실무·상황·경험 질문 | 기업 질문(지원동기·인재상·적합성) + 직무 질문(실무) + JD 요건 검증 |
| 선택 | 선택 사항 | 필수 (검색·분야 선택·직접 입력) | 둘 다 고르면 자동 조합 |

### 검색·프롬프트 크기 관리

질문이 수천 개여도 AI에게 전부 보내지 않습니다. 직무 → 유형 → 카테고리 → 난이도·경력 → 이미 한 질문 제외 순으로 좁혀 **후보 20개 안팎**만 프롬프트에 넣고, 면접 설계도가 추천하는 다음 질문 유형을 함께 전달합니다(`shared/roleBank.ts`, `server/prompts/common.ts`).

## 스크립트

| 명령 | 내용 |
|---|---|
| `npm run dev` | API 서버(tsx watch) + Vite |
| `npm run lint` | ESLint (react-hooks 포함) |
| `npm run typecheck` | 클라이언트 + 서버 `tsc --noEmit` |
| `npm test` | Vitest — 상태 머신, Mock 면접관, 직무 매칭, 직무별 질문 적합도, 기업+직무 조합, 프롬프트 |
| `npm run build:data` | 직무 데이터 + 기업 데이터 재생성 |
| `npm run validate:roles` | 직무 분류·프로필·별칭 검증 |
| `npm run validate:questions` | 질문 스키마·출처·의미 중복·직무 적합도 검증 (`-- --verbose`로 직무별 PASS/FAIL) |
| `npm run validate:data` | 생성 파일 최신 여부 + 전체 데이터 검증 |
| `npm run build` | typecheck → 프로덕션 빌드 |
| `npm run qa` | lint → typecheck → test → validate:data → build (CI와 동일) |

## 디버그 모드

`/?debug=true` — 우측 하단 패널:
MODE, AI PROVIDER, INTERVIEW STATE, QUESTION INDEX, CURRENT QUESTION, CURRENT SCORE, TOTAL ROLES, TOTAL QUESTIONS, COMPANIES, CURRENT ROLE, ROLE QUESTIONS, ROLE TYPES, ROLE CATEGORIES, TOKEN STATUS
+ Next Question · Trigger Follow-up · Mock Excellent/Poor Answer · Complete Interview · Reset · Clear Local Data · Test Voice · Test Error

---

## 아키텍처

```
shared/                 브라우저·서버 공통 계약
  schemas.ts            zod 스키마 (요청 검증 + AI 구조화 출력 포맷 + 클라이언트 재검증)
  roles.ts              직무 taxonomy · 검색(퍼지·별칭) · RoleResolver(roleContextFor)
  blueprints.ts         직무 유형별 면접 설계도(질문 비중·순서·꼬리질문 방향·압박 질문·직무 관점 신호)
  roleBank.ts           질문 저장소 로딩(도메인별 분할) · 후보 검색(retrieval)
  similarity.ts         어휘 + 의미 중복 판정 · relevance.ts 직무 적합도
  companies.ts          기업 프로필 · 기업 질문 로딩
  sanitize.ts           점수 clamp, 근거 인용 검증(답변에 없는 인용 제거), 길이 제한
  labels.ts
server/                 API 레이어 (비밀키 보관)
  index.ts              node:http — /api/health, /api/ai/{question,follow-up,analyze,report,role-profile}, 정적 서빙
  claude.ts             Anthropic SDK · beta.messages.parse + JSON schema 구조화 출력
  prompts/              questionPrompt · followupPrompt · analysisPrompt · reportPrompt · rolePrompt · common
scripts/                build-role-data.ts · validate-data.ts · build-company-data.mjs
                        build-panel-photos.py — assets/panel 포즈 시트 → public/panel/<seat>/<state>-<n>.webp
src/
  services/ai/          AIProvider 인터페이스 · RealAIProvider · MockAIProvider · providerFactory
  services/speech/      speechRecognition · speechSynthesis
  state/                interviewMachine.ts — 단일 reducer 상태 머신
  hooks/                useInterview(오케스트레이터) · useTimer · useVoiceInput · useMediaQuery
  components/           InterviewRoom(면접실: 사진 합성 / SVG 일러스트) · QuestionPanel · AnswerInput · InterviewNotes
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
| 15 | lint · typecheck · unit test(66) · data validation · build (`npm run qa`) | ✅ |
| 16 | 직무 선택: 검색(회계) · 분야→직무(의료·보건) · 넓은 입력(사무직 → 되묻기) · 직접 입력(방송 기술감독 → 분야 추정) · 모바일 | ✅ |
| 17 | 간호사 면접: 실무 면접관 "간호부", 직무 질문 + 출처 배지, 답변 속 "환자" → 환자 안전 꼬리질문 | ✅ |

AI MODE는 로컬 가짜 Messages API로 서버 요청 형태(모델, 구조화 출력, fallback 헤더)와 브라우저 흐름(꼬리질문 표시, 환각 인용 제거)을 검증했습니다. 실제 Claude 응답 품질은 `ANTHROPIC_API_KEY` 를 넣고 확인이 필요합니다.

> AI-generated mock interview feedback. Scores are for practice purposes only.
