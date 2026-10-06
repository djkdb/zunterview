# CLAUDE.md

INTERVIEW//AI: 한국식 다대일 AI 모의면접 웹앱 (React + Vite, Node 서버, Claude API). 개인전 AI 개발 대회 출품작이라 개발 과정의 기록도 결과물의 일부입니다.

## 기록 규칙 (항상 지킬 것)

- **트러블슈팅**: 버그, 외부 API 오류, 환경 문제를 해결하면 `docs/TROUBLESHOOTING.md` 맨 아래에 같은 형식(증상 → 원인 → 디버깅 → 해결 → 재발 방지, 관련 커밋)으로 추가한다. 해결하지 못한 문제도 "미해결"로 남긴다.
- **프롬프트 변경**: `server/prompts/`나 목 면접관 규칙을 바꾸면 `docs/PROMPTS.md`에 무엇이 문제였고 무엇을 바꿨는지 추가한다. 사용자가 준 주요 지시도 개발 프롬프트 표에 한 줄 추가한다.
- 기록은 사실만 쓴다. 측정하지 않은 수치나 써 보지 않은 서비스의 특징은 쓰지 않는다.
- 문서와 화면 문구는 `.claude/skills/humanizer` 기준으로 쓴다(줄표, "단순히 ~가 아니라", 상투어 금지).

## 개발 규칙

- 품질 검사는 `npm run qa`. 타입 검사는 `--noEmit`으로만 한다(`tsc -b`는 `.js`를 만들어 `.ts`를 가린다).
- API 키는 `.env`에만 둔다. 절대 커밋하지 않는다.
- 유료 외부 API(TTS 등)는 요청을 몰아서 보내지 않는다(Typecast 계정 차단 사례, TROUBLESHOOTING 14번).
- 서버를 끌 때는 `pkill -f` 대신 PID로 `kill`한다.
- UI는 `.claude/skills/frontend-design` 기준을 따른다.
