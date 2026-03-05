import { cn } from "@/lib/utils";

export interface BrandMarkProps {
  className?: string;
  /** base = header, lg = hero, xl = login */
  size?: "base" | "lg" | "xl";
}

/**
 * wealth.Investing — logo premium com ponto dourado como elemento de identidade.
 * "wealth" leve + "." ouro + "Investing" bold — hierarquia visual sofisticada.
 */
export function BrandMark({ className, size = "base" }: BrandMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline whitespace-nowrap select-none",
        size === "base" && "text-[1.1rem]",
        size === "lg"   && "text-2xl md:text-3xl",
        size === "xl"   && "text-3xl sm:text-4xl md:text-5xl",
        className
      )}
      style={{ letterSpacing: "-0.025em" }}
    >
      {/* "wealth" — peso leve, tom neutro */}
      <span
        className="font-light text-foreground/55"
        style={{ fontWeight: 300, letterSpacing: "-0.03em" }}
      >
        wealth
      </span>

      {/* "." — ponto dourado, identidade premium */}
      <span
        className={cn(
          "font-black",
          size === "base" ? "mx-[0.5px] text-[1.2em]" : "mx-[1px] text-[1.15em]"
        )}
        style={{
          background: "linear-gradient(135deg, #C9A96E 0%, #E8C97A 45%, #B8924F 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          lineHeight: 1,
          position: "relative",
          top: "0.03em",
        }}
      >
        .
      </span>

      {/* "Investing" — peso bold, cor forte */}
      <span
        className="font-semibold text-foreground"
        style={{ letterSpacing: "-0.025em" }}
      >
        Investing
      </span>
    </span>
  );
}
