import { cn } from "@/lib/utils";

export interface BrandMarkProps {
  className?: string;
  /** base = header/geral, lg = hero, xl = login (um step acima) */
  size?: "base" | "lg" | "xl";
}

/**
 * Logo textual premium: "wealth" (cinza médio) + "." (destaque) + "Investing" (grafite).
 * whitespace-nowrap mantém "wealth. Investing" na mesma linha.
 */
export function BrandMark({ className, size = "base" }: BrandMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline whitespace-nowrap tracking-tight-apple",
        size === "base" && "text-lg",
        size === "lg" && "text-2xl md:text-3xl",
        size === "xl" && "text-2xl sm:text-3xl md:text-4xl",
        className
      )}
      style={{ letterSpacing: "-0.01em" }}
    >
      <span className="font-semibold text-muted-foreground">wealth</span>
      <span className="font-semibold text-secondary-foreground">.</span>
      <span className="font-bold text-foreground"> Investing</span>
    </span>
  );
}
