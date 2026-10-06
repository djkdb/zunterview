# AI 워크플로우와 개발 환경

## 쓰는 AI 도구와 역할

| 도구 | 역할 | 고른 이유 |
|---|---|---|
| Claude Code (웹, 클라우드 세션) | 설계, 구현, 테스트, 시뮬레이션, 커밋까지 개발 전 과정 | 저장소 전체를 읽고 명령을 실행하며, 브라우저(Playwright)로 결과를 직접 확인할 수 있음 |
| Claude Sonnet 5.5 (앱 안의 AI 면접관) | 질문 생성, 꼬리질문 판단, 답변 분석, 최종 리포트 | 짧고 구조화된 면접 턴에 충분한 품질, Opus보다 저렴하고 빠름. `AI_MODEL`로 교체 가능 |
| Claude Code 스킬: frontend-design, humanizer | UI가 "AI가 만든 티"가 나지 않게, 문구가 사람 말처럼 들리게 하는 검토 기준 | 취향을 매번 말로 설명하는 대신 검증된 지침을 저장소에 둠(`.claude/skills/`) |
| TTS: Typecast, ElevenLabs, Fish Audio | 면접관 3명의 목소리 | 한국어 목소리 품질과 비용, 장애 시 대체를 위해 여러 개를 순서대로 사용 |

## 개발 파이프라인

```text
 요구 (자연어)
   │  예: "5명의 페르소나로 실제로 시뮬레이션 해 봐"
   ▼
 Claude Code ── 코드 수정 ──▶ 품질 게이트 ──▶ 시뮬레이션 ──▶ 커밋·푸시
                               lint            Playwright로 페르소나가
                               typecheck       접수부터 평가표까지 진행
                               vitest(181개)   스크린샷 검토
                               데이터 검증
                               build
   ▲                                              │
   └────── 발견한 문제 (docs/TROUBLESHOOTING.md) ◀─┘
```

- **품질 게이트**: `npm run qa` 한 번에 lint, 타입 검사, 테스트, 데이터 검증, 빌드를 돌린다. GitHub Actions(`.github/workflows/ci.yml`)도 같은 검사를 한다.
- **페르소나 시뮬레이션**: 간호학과 신입(모바일), 회계 4년 차 이직(압박 면접), 비전공 부트캠프 수료생, 영어 면접 마케터, 짧게 답하는 공기업 준비생, 서류를 낸 소프트웨어학부 졸업생. 각자 답변 패턴이 다르게 스크립트로 정해져 있다.
- **CLI 면접**: 한 명을 정해 질문이 나올 때마다 답을 직접 써 넣으며 면접 하나를 끝까지 진행한다.
- **가짜 API 서버** (`npm run mock:anthropic`): 실제 Anthropic API 대신 쓰는 로컬 서버. `MODE`로 정상, 챗봇 말투, 깨진 JSON, 지연, 거절을 골라 AI 실패 처리를 재현한다.
- **프롬프트 평가** (`npm run eval:prompts`): 실패했던 상황 9가지를 실제 모델에 돌려 자동 검사하고, 프롬프트 버전별 결과를 `docs/eval/`에 남긴다. 자세한 내용은 [PROMPTS.md](PROMPTS.md) 3절.

## 앱 구조

```text
 브라우저 (React, Vite)                서버 (Node)                 외부
 ┌───────────────────────┐   /api/*   ┌──────────────────┐        ┌───────────┐
 │ 접수 → 대기실 → 면접   │ ─────────▶ │ 요청 검증 (zod)   │ ─────▶ │ Claude    │
 │ → 평가표               │            │ 프롬프트 조립     │        │ (구조화   │
 │ MockAIProvider (키 없을 때)│ ◀───────── │ 응답 검증·정리     │ ◀───── │  출력)    │
 │ 기록은 localStorage    │   /api/tts │ TTS 서비스 순서   │ ─────▶ │ Typecast  │
 └───────────────────────┘            └──────────────────┘        │ ElevenLabs│
                                                                    │ Fish Audio│
                                                                    └───────────┘
```

- API 키와 프롬프트는 서버에만 있다. 브라우저는 검증된 면접 데이터만 보낸다.
- AI 응답은 JSON 스키마로 받고, 서버와 브라우저에서 한 번 더 검증한다. 하나라도 실패하면 그 턴만 MOCK 면접관이 대신한다.

## 환경 설정

```bash
npm install
cp .env.example .env      # 키는 .env에만 (git에 올라가지 않음)
npm run dev               # 개발 서버 (웹 5173, API 8787)
npm run qa                # 전체 품질 검사
```

`.env`에 넣는 값(모두 선택, 없으면 MOCK 면접관과 브라우저 음성으로 동작):

| 변수 | 용도 |
|---|---|
| `ANTHROPIC_API_KEY` | AI 면접관 |
| `AI_MODEL` | 기본 `claude-sonnet-5-5` |
| `TYPECAST_API_KEY`, `ELEVEN_API_KEY`, `FISH_AUDIO_API_KEY` | 면접관 음성(이 순서로 시도) |
