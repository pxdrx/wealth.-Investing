import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-[transform,opacity,background-color] duration-150 ease-out active:scale-[0.99] [@media(hover:hover)]:hover:transition-[transform,opacity,background-color]",
  {
    variants: {
      variant: {
        default: "rounded-full bg-primary text-primary-foreground shadow-sm [@media(hover:hover)]:hover:bg-primary/92 [@media(hover:hover)]:hover:-translate-y-px",
        destructive: "rounded-full bg-stone-600 text-white [@media(hover:hover)]:hover:bg-stone-700 [@media(hover:hover)]:hover:-translate-y-px",
        outline: "rounded-full border border-border bg-background [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-accent-foreground [@media(hover:hover)]:hover:-translate-y-px",
        secondary: "rounded-full bg-secondary text-secondary-foreground [@media(hover:hover)]:hover:bg-secondary/85 [@media(hover:hover)]:hover:-translate-y-px",
        ghost: "rounded-full [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-accent-foreground",
        link: "rounded-full text-primary underline-offset-4 [@media(hover:hover)]:hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
