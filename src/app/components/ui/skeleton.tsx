import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("editorial-skeleton border border-[var(--ink)] bg-[var(--paper)]", className)}
      {...props}
    />
  );
}

export { Skeleton };
