import { cn } from "@/lib/utils";

export interface BrandMarkProps {
  className?: string;
  size?: "base" | "lg" | "xl";
}

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
      <span className="font-light text-foreground/50" style={{ fontWeight: 300, letterSpacing: "-0.03em" }}>
        wealth
      </span>
      <span
        className="font-black text-foreground mx-[1px]"
        style={{ letterSpacing: "-0.01em" }}
      >
        .
      </span>
      <span className="font-semibold text-foreground" style={{ letterSpacing: "-0.025em" }}>
        Investing
      </span>
    </span>
  );
}
