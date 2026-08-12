"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "./utils";

const TabsValueContext = React.createContext<string | undefined>(undefined);

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [activeValue, setActiveValue] = React.useState(value ?? defaultValue);

  React.useEffect(() => {
    if (value !== undefined) setActiveValue(value);
  }, [value]);

  return (
    <TabsValueContext.Provider value={activeValue}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-6", className)}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(nextValue) => {
          setActiveValue(nextValue);
          onValueChange?.(nextValue);
        }}
        {...props}
      />
    </TabsValueContext.Provider>
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-auto w-fit items-end justify-start border-b border-[var(--ink)] bg-transparent text-[var(--ink-soft)]",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const activeValue = React.useContext(TabsValueContext);
  const reducedMotion = useReducedMotion();
  const isActive = activeValue === value;

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "label-caps relative inline-flex h-auto flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-4 py-3 text-[var(--ink-soft)] transition-colors data-[state=active]:text-[var(--ink)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      value={value}
      {...props}
    >
      {children}
      {isActive && (
        <motion.span
          layoutId="editorial-tab-underline"
          className="absolute inset-x-0 -bottom-px h-1 bg-[var(--accent-news)]"
          transition={reducedMotion ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
