import { COMPANIES } from "../../shared/companies";
import { CompanyCard } from "../components/CompanyCard";
import { CompanyFilterBar } from "../components/CompanyFilterBar";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { COMPANY_DISCLAIMER } from "../config/options";
import { useCompanyFilter } from "../hooks/useCompanyFilter";

export function CompaniesPage({ onOpen, onHome, onStart }: { onOpen: (id: string) => void; onHome: () => void; onStart: () => void }) {
  const f = useCompanyFilter();
  const total = COMPANIES.reduce((s, c) => s + c.questions.length, 0);
  return (
    <div className="min-h-dvh pb-16">
      <TopBar
        onHome={onHome}
        right={
          <Button size="sm" variant="primary" onClick={onStart}>
            일반 면접 보기
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="pt-8 pb-6">
          <p className="text-sm font-semibold text-accent">기업별 모의면접</p>
          <h1 className="mt-1.5 text-2xl font-extrabold text-navy sm:text-3xl">지원하는 기업의 면접을 미리 경험해 보세요</h1>
          <p className="mt-2 text-[15px] text-muted">
            대기업·IT·금융·공기업·공공기관 {COMPANIES.length}곳, 예상 질문 {total}개. 인재상과 면접 전형, 실제 후기에 보고된 질문을 바탕으로 면접관이 질문합니다.
          </p>
        </div>
        <CompanyFilterBar query={f.query} onQuery={f.setQuery} category={f.category} onCategory={f.setCategory} />
        {f.list.length ? (
          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {f.list.map((c) => (
              <li key={c.id}>
                <CompanyCard c={c} onClick={() => onOpen(c.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 text-center text-sm text-muted">검색 결과가 없습니다. 기업이 없다면 일반 면접에 채용공고를 붙여넣어 연습할 수 있어요.</p>
        )}
        <p className="mt-10 text-center text-[12px] leading-relaxed text-faint">{COMPANY_DISCLAIMER}</p>
      </main>
    </div>
  );
}
