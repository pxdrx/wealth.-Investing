interface GridPatternProps {
  className?: string;
}

export function GridPattern({ className = "" }: GridPatternProps) {
  return (
    <div
      className={`landing-grid-pattern pointer-events-none absolute inset-0 ${className}`}
      style={{
        maskImage:
          "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at center, black 30%, transparent 80%)",
      }}
      aria-hidden="true"
    />
  );
}
