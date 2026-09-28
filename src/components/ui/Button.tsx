import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-ink text-bg hover:bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_30px_-8px_rgba(139,124,246,0.55)]",
  secondary: "bg-surface-2 text-ink border border-line-strong hover:bg-surface-3",
  ghost: "text-muted hover:text-ink hover:bg-white/5",
  danger: "bg-surface-2 text-low border border-low/30 hover:bg-low/10",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-14 px-8 text-[15px]",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  mono?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = "secondary", size = "md", mono = true, icon, className = "", children, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
        mono ? "font-mono tracking-[0.12em] uppercase" : ""
      } ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
