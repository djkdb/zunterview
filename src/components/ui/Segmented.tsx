import { useId } from "react";

interface Option<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string | number> {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (v: T) => void;
  columns?: number;
}

/** Accessible single-choice control (radio group with arrow-key support). */
export function Segmented<T extends string | number>({ label, value, options, onChange, columns }: Props<T>) {
  const id = useId();
  const onKey = (e: React.KeyboardEvent, idx: number) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = options[(idx + dir + options.length) % options.length];
    onChange(next.value);
    document.getElementById(`${id}-${String(next.value)}`)?.focus();
  };
  return (
    <fieldset>
      <legend className="label mb-2.5">{label}</legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o, i) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              id={`${id}-${String(o.value)}`}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onKeyDown={(e) => onKey(e, i)}
              onClick={() => onChange(o.value)}
              className={`min-h-11 rounded-lg border px-2 py-2 text-sm transition-colors duration-200 ${
                active
                  ? "border-accent bg-accent-soft font-semibold text-accent"
                  : "border-line-strong bg-surface text-muted hover:border-accent/40 hover:text-ink"
              }`}
            >
              <span className="block leading-tight">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-[11px] text-faint">{o.hint}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
