type Country = "US" | "EU" | "UK" | "JP" | "BR";

export function FlagIcon({ country, className = "" }: { country: Country; className?: string }) {
  const base = `inline-block rounded-[2px] shrink-0 ${className}`;
  switch (country) {
    case "US":
      return (
        <svg viewBox="0 0 20 14" className={`${base} w-5 h-[14px]`} aria-hidden>
          <rect width="20" height="14" fill="#b22234" />
          {[1, 3, 5, 7, 9, 11, 13].map((y) => (
            <rect key={y} y={y} width="20" height="1" fill="#fff" />
          ))}
          <rect width="8" height="7.5" fill="#3c3b6e" />
        </svg>
      );
    case "EU":
      return (
        <svg viewBox="0 0 20 14" className={`${base} w-5 h-[14px]`} aria-hidden>
          <rect width="20" height="14" fill="#003399" />
          <text x="10" y="11" textAnchor="middle" fontSize="11" fill="#ffcc00">★</text>
        </svg>
      );
    case "UK":
      return (
        <svg viewBox="0 0 20 14" className={`${base} w-5 h-[14px]`} aria-hidden>
          <rect width="20" height="14" fill="#012169" />
          <path d="M0,0 L20,14 M20,0 L0,14" stroke="#fff" strokeWidth="1.5" />
          <path d="M10,0 L10,14 M0,7 L20,7" stroke="#fff" strokeWidth="3" />
          <path d="M10,0 L10,14 M0,7 L20,7" stroke="#cf142b" strokeWidth="1.5" />
        </svg>
      );
    case "JP":
      return (
        <svg viewBox="0 0 20 14" className={`${base} w-5 h-[14px]`} aria-hidden>
          <rect width="20" height="14" fill="#fff" />
          <circle cx="10" cy="7" r="4" fill="#bc002d" />
        </svg>
      );
    case "BR":
      return (
        <svg viewBox="0 0 20 14" className={`${base} w-5 h-[14px]`} aria-hidden>
          <rect width="20" height="14" fill="#009c3b" />
          <polygon points="10,2 18,7 10,12 2,7" fill="#ffdf00" />
          <circle cx="10" cy="7" r="2.5" fill="#002776" />
        </svg>
      );
  }
}
