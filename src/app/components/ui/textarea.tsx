import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "font-mono-ui flex field-sizing-content min-h-24 w-full resize-none rounded-none border-0 border-b-2 border-[var(--ink)] bg-transparent px-0 py-3 text-base outline-none transition-[border-color,color] placeholder:text-[var(--ink-faint)] focus-visible:border-[var(--accent-news)] focus-visible:ring-0 aria-invalid:border-[var(--accent-news)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
