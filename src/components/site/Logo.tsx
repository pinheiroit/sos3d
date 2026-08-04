import { Link } from "@tanstack/react-router";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const isLight = variant === "light";
  return (
    <Link to="/" className="group flex items-center gap-3" aria-label="SOS.3D — página inicial">
      <span
        className={`grid h-10 w-10 place-items-center rounded-lg transition-transform group-hover:scale-105 ${
          isLight ? "bg-white/10 ring-1 ring-white/25" : "bg-brand"
        }`}
      >
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <path
            d="M16 3l11 6.5v13L16 29 5 22.5v-13L16 3z"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M16 10l5.5 3.2v6.6L16 23l-5.5-3.2v-6.6L16 10z"
            fill="none"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="leading-none">
        <span
          className={`block text-lg font-bold tracking-tight ${isLight ? "text-white" : "text-brand"}`}
        >
          SOS<span className="text-accent">.</span>3D
        </span>
        <span
          className={`mt-1 block text-[10px] font-medium uppercase tracking-[0.16em] ${
            isLight ? "text-white/70" : "text-muted-foreground"
          }`}
        >
          Manufatura aditiva · laser · design
        </span>
      </span>
    </Link>
  );
}
