interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-label="wealth.Investing logo"
    >
      {/* Abstract ascending chart — 3 angular lines */}
      <path
        d="M4 24L12 16L20 20L28 8"
        stroke="hsl(var(--landing-accent))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 20L12 12L20 16L28 4"
        stroke="hsl(var(--landing-accent))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <circle
        cx="28"
        cy="8"
        r="2.5"
        fill="hsl(var(--landing-accent))"
      />
    </svg>
  );
}
