import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "font-mono-ui inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 text-sm tracking-wide outline-none transition-[transform,box-shadow,background-color,color,border-color] duration-200 active:translate-y-0 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--accent-news)] active:shadow-[var(--shadow-hard-sm)]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "border-[var(--ink)] bg-transparent text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]",
        secondary:
          "border-[var(--ink)] bg-transparent text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]",
        ghost:
          "border-transparent bg-transparent text-[var(--ink)] hover:border-[var(--ink)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 has-[>svg]:px-5",
        sm: "h-9 gap-1.5 px-4 text-xs has-[>svg]:px-3",
        lg: "h-12 px-8 has-[>svg]:px-6",
        icon: "size-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingLabel = "Loading",
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    loadingLabel?: string;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-loading={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      aria-busy={loading || undefined}
      {...props}
      disabled={loading || props.disabled}
    >
      {loading && !asChild ? (
        <>
          <span className="sr-only">{loadingLabel}</span>
          <span className="button-loading-dots" aria-hidden="true"><i /><i /><i /></span>
        </>
      ) : children}
    </Comp>
  );
}

export { Button, buttonVariants };
