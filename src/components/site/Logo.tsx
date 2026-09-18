import { Link } from "@tanstack/react-router";
import { useSiteImage } from "@/lib/site-images";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const isLight = variant === "light";
  const main = useSiteImage("logo-principal");
  const light = useSiteImage("logo-clara");
  const custom = isLight ? (light ?? main) : (main ?? light);

  if (custom) {
    return (
      <Link to="/" className="group flex items-center justify-center" aria-label="SOS.3D — página inicial">
        <img
          src={custom}
          alt="SOS.3D"
          className="h-20 w-auto max-w-[190px] object-contain transition-transform duration-200 group-hover:scale-[1.04] md:h-40 md:max-w-[560px]"
        />
      </Link>
    );
  }

  return (
    <Link to="/" className="group flex items-center justify-center gap-2 md:justify-start md:gap-3.5" aria-label="SOS.3D — página inicial">
      <span
        className={`grid h-16 w-16 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-[1.04] md:h-28 md:w-28 md:rounded-2xl ${
          isLight ? "bg-white/10 ring-1 ring-white/25" : "bg-brand"
        }`}
      >
        <svg viewBox="0 0 32 32" className="h-9 w-9 md:h-16 md:w-16" aria-hidden="true">
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
          className={`block text-2xl font-extrabold md:text-5xl ${isLight ? "text-white" : "text-brand"}`}
        >
          SOS<span className="text-accent">.</span>3D
        </span>
        <span
          className={`mt-1 hidden text-sm font-semibold uppercase md:mt-2.5 md:block ${
            isLight ? "text-white/70" : "text-muted-foreground"
          }`}
        >
          Manufatura aditiva · laser · design
        </span>
      </span>
    </Link>
  );
}
