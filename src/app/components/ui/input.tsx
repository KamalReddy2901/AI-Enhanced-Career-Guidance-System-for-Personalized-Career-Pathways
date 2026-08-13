import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "font-mono-ui flex h-11 w-full min-w-0 rounded-none border-0 border-b-2 border-[var(--ink)] bg-transparent px-0 py-2.5 text-base outline-none transition-[border-color,color] placeholder:text-[var(--ink-faint)] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 md:text-sm",
        "focus-visible:border-[var(--accent-news)] focus-visible:ring-0",
        "aria-invalid:border-[var(--accent-news)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
