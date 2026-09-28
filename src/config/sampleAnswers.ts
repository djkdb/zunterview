import type { Language } from "../../shared/schemas";

/** Canned answers for the debug panel ("Mock Excellent / Poor Answer"). */
export const SAMPLE_ANSWERS: Record<"excellent" | "poor", Record<Language, string>> = {
  excellent: {
    ko: "당시 저는 커머스 서비스의 상품 목록 페이지를 담당했는데, 첫 로딩이 3초 이상 걸려 이탈률이 높은 상황이었습니다. 제 목표는 로딩 시간을 절반 이하로 줄이는 것이었습니다. 먼저 Chrome DevTools로 프로파일링을 해서 불필요한 리렌더링과 큰 번들이 원인이라는 것을 찾았습니다. 그래서 메모이제이션과 코드 스플리팅을 적용했고, 이미지를 lazy loading으로 바꿨습니다. 그 결과 첫 로딩 시간이 3.2초에서 1.1초로 줄었고, 이탈률도 18% 감소했습니다.",
    en: "At the time I owned the product listing page of our commerce app, and the first load took over 3 seconds, so bounce rate was high. My goal was to cut load time by more than half. First I used Chrome DevTools profiling and found that unnecessary re-renders and a large bundle were the cause. So I applied memoization and code splitting, and switched images to lazy loading. As a result, first load dropped from 3.2 seconds to 1.1 seconds and bounce rate decreased by 18%.",
  },
  poor: {
    ko: "음 그냥 열심히 했던 것 같아요.",
    en: "Um, I guess I just worked hard on it.",
  },
};
