/** Red ink seal marking the sheet as practice-only (never a real hiring result). */
export function Stamp({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none flex h-20 w-20 -rotate-12 items-center justify-center rounded-full border-[3px] border-stamp text-stamp opacity-80 mix-blend-multiply sm:h-24 sm:w-24 ${className}`}
      aria-label="모의면접 연습용 도장"
    >
      <span className="flex h-[84%] w-[84%] flex-col items-center justify-center rounded-full border border-stamp">
        <span className="text-[15px] font-extrabold tracking-[0.08em] sm:text-[17px]">모의면접</span>
        <span className="my-0.5 h-px w-10 bg-stamp" />
        <span className="text-[11px] font-bold tracking-[0.3em]">연습용</span>
      </span>
    </div>
  );
}
