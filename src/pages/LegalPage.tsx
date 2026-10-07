import type { ReactNode } from "react";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";

export type LegalDoc = "terms" | "privacy";

/** Bump when the policy text changes; a stored consent for an older version asks again. */
export const PRIVACY_VERSION = "2026-10-06";

/** Fill these in before launch (사업자 정보와 개인정보 보호책임자). */
const OPERATOR = {
  name: "[운영자 또는 상호]",
  officer: "[개인정보 보호책임자 성명]",
  email: "[연락 이메일]",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[17px] font-bold text-navy">{title}</h2>
      <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function Privacy() {
  return (
    <>
      <p>
        INTERVIEW//AI(이하 "서비스")는 모의면접 연습에 필요한 만큼만 정보를 다루고, 지원자의 답변과 서류를 서버에 저장하지 않습니다. 이 방침은 어떤 정보가 어디로 가고 얼마나 남는지 설명합니다.
      </p>
      <Section title="1. 처리하는 정보와 목적">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface-2 text-left">
              <th className="border border-line px-2 py-1.5">정보</th>
              <th className="border border-line px-2 py-1.5">목적</th>
              <th className="border border-line px-2 py-1.5">보관</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["면접 답변(텍스트, 음성 답변을 받아 적은 글, 1분 자기소개 연습 글)", "질문 생성, 꼬리질문 판단, 채점", "AI 면접관 사용 시 처리 중에만 서버를 거치며 저장하지 않음. 면접 기록은 이용자의 브라우저에만 저장"],
              ["자기소개서·이력서 텍스트(선택)", "서류 기반 질문, 서류와 답변 비교", "이메일·전화번호·주민번호·링크는 브라우저에서 가린 뒤 처리. 서버 미저장. 면접 기록에는 본문 대신 사용 여부와 비교 결과의 짧은 인용만 남음"],
              ["접속 IP 주소", "하루 사용량 제한(과도한 호출 방지)", "날마다 바뀌는 값으로 해시해 당일 메모리에서만 사용, 원래 주소는 저장하지 않음"],
              ["이용 통계(면접 시작·완료 횟수, 직무 유형, 문항 수, 점수 구간)", "서비스 개선", "답변·서류·이름은 포함하지 않음. 월별 로그로 보관 후 1년 내 삭제"],
              ["평가표 의견(선택해서 남긴 한 줄)", "서비스 개선", "통계와 함께 보관, 1년 내 삭제"],
            ].map((row) => (
              <tr key={row[0]} className="align-top">
                {row.map((cell, i) => (
                  <td key={i} className="border border-line px-2 py-1.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p>회원가입이 없어 이름, 연락처, 계정 정보는 받지 않습니다. 카메라는 쓰지 않고, 마이크는 [음성 답변] 버튼을 누른 동안에만 브라우저의 음성 인식에 쓰입니다.</p>
      </Section>
      <Section title="2. 처리 위탁과 국외 이전">
        <p>AI 면접관과 면접관 음성을 쓰는 경우에 한해 아래 업체가 정보를 처리합니다. 업체는 요청을 처리하는 데에만 정보를 쓰며, 각 업체의 보관 정책을 따릅니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Anthropic, PBC (미국): 면접 답변, 서류 텍스트, 직무 설정. AI 면접관이 질문을 만들고 채점하기 위해. 면접 중 호출할 때마다 네트워크로 전송.</li>
          <li>면접관 음성 서비스(Typecast, ElevenLabs, Fish Audio 중 연결된 곳; 국외 업체 포함): 면접관이 읽을 질문 문장. 서류 기반 면접에서는 질문에 서류 문장의 짧은 인용이 들어갈 수 있음.</li>
        </ul>
        <p>AI 면접관 없이(MOCK 모드) 연습하면 답변과 서류는 브라우저 밖으로 나가지 않습니다.</p>
      </Section>
      <Section title="3. 이용자의 권리">
        <p>면접 기록, 답변 노트에 적은 답, 자기소개 연습 기록은 이용자 브라우저에만 있으므로 [면접 기록] 화면의 "기록 삭제"나 브라우저 저장소 삭제로 언제든 지울 수 있습니다. 통계나 의견에 대한 문의, 삭제 요청은 아래 연락처로 보내 주세요.</p>
      </Section>
      <Section title="4. 개인정보 보호책임자">
        <p>
          {OPERATOR.name} · 책임자 {OPERATOR.officer} · {OPERATOR.email}
        </p>
      </Section>
      <p className="mt-8 text-[13px] text-faint">시행일 {PRIVACY_VERSION} (출시 전 초안. 법률 검토 후 확정하세요.)</p>
    </>
  );
}

function Terms() {
  return (
    <>
      <Section title="1. 서비스">
        <p>INTERVIEW//AI는 AI 면접관과 모의면접을 연습하고 평가표를 받는 서비스입니다. 현재 무료로 제공하며, 내용과 제공 방식은 바뀔 수 있습니다. 하루 사용량에는 제한이 있고, 한도를 넘으면 규칙 기반 면접관(MOCK)으로 이어집니다.</p>
      </Section>
      <Section title="2. 평가 결과의 성격">
        <p>점수와 피드백은 연습을 돕기 위한 참고 자료이며 실제 채용 결과를 예측하거나 보장하지 않습니다. 기업별 질문은 공개된 후기와 공식 자료를 재구성한 연습용 질문이며 해당 기업과 무관합니다.</p>
      </Section>
      <Section title="3. 이용자가 지킬 것">
        <ul className="list-disc space-y-1 pl-5">
          <li>타인의 서류나 개인정보를 넣지 않습니다.</li>
          <li>자동화된 방법으로 대량 호출하거나 서비스를 방해하지 않습니다.</li>
          <li>면접관에게 욕설이나 부적절한 말을 하면 그 면접은 중단됩니다.</li>
        </ul>
      </Section>
      <Section title="4. 권리">
        <p>이용자가 쓴 답변과 서류의 권리는 이용자에게 있습니다. 서비스의 화면, 질문 데이터, 면접관 이미지와 음성에 대한 권리는 운영자와 각 권리자에게 있습니다.</p>
      </Section>
      <Section title="5. 책임의 한계">
        <p>운영자는 서비스 중단, 외부 AI·음성 서비스의 장애, 이용자 기기 문제로 생긴 손해에 대해 고의나 중대한 과실이 없는 한 책임지지 않습니다.</p>
      </Section>
      <Section title="6. 문의">
        <p>
          {OPERATOR.name} · {OPERATOR.email}
        </p>
      </Section>
      <p className="mt-8 text-[13px] text-faint">시행일 {PRIVACY_VERSION} (출시 전 초안. 법률 검토 후 확정하세요.)</p>
    </>
  );
}

export function LegalPage({ doc, onHome, onSwitch }: { doc: LegalDoc; onHome: () => void; onSwitch: (d: LegalDoc) => void }) {
  return (
    <div className="min-h-dvh pb-16">
      <TopBar onHome={onHome} />
      <main className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-6">
        <div className="flex gap-2">
          <Button size="sm" variant={doc === "terms" ? "primary" : "secondary"} onClick={() => onSwitch("terms")}>
            이용약관
          </Button>
          <Button size="sm" variant={doc === "privacy" ? "primary" : "secondary"} onClick={() => onSwitch("privacy")}>
            개인정보처리방침
          </Button>
        </div>
        <h1 className="mt-6 text-2xl font-extrabold text-navy">{doc === "terms" ? "이용약관" : "개인정보처리방침"}</h1>
        <article className="mt-2">{doc === "terms" ? <Terms /> : <Privacy />}</article>
      </main>
    </div>
  );
}
