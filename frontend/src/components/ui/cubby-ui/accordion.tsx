"use client";

import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface AccordionContextValue {
  openItems: string[];
  toggleItem: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | undefined>(undefined);
const AccordionItemContext = createContext<string>("");

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple";
  collapsible?: boolean;
  defaultValue?: string[];
}

export const Accordion: React.FC<AccordionProps> = ({
  type = "single",
  defaultValue = [],
  className,
  children,
  ...props
}) => {
  const [openItems, setOpenItems] = useState<string[]>(defaultValue);

  const toggleItem = (id: string) => {
    if (type === "single") {
      setOpenItems((prev) => (prev.includes(id) ? [] : [id]));
    } else {
      setOpenItems((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    }
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className={cn("space-y-2.5", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, className, children, ...props }, ref) => {
    return (
      <AccordionItemContext.Provider value={value}>
        <div
          ref={ref}
          data-value={value}
          className={cn(
            "rounded-xl border border-white/[0.08] bg-[#0c1017] transition-all overflow-hidden",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  }
);
AccordionItem.displayName = "AccordionItem";

export interface AccordionTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string;
}

export const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ value, className, children, ...props }, ref) => {
    const context = useContext(AccordionContext);
    const itemValue = useContext(AccordionItemContext);
    if (!context) throw new Error("AccordionTrigger must be used within Accordion");

    const effectiveValue = value || itemValue;
    const isOpen = context.openItems.includes(effectiveValue);

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => context.toggleItem(effectiveValue)}
        className={cn(
          "flex w-full items-center justify-between p-4 text-left text-xs sm:text-sm font-semibold text-white transition-colors hover:text-emerald-300 focus:outline-none cursor-pointer",
          isOpen && "text-emerald-300",
          className
        )}
        {...props}
      >
        <span>{children}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-emerald-400"
          )}
        />
      </button>
    );
  }
);
AccordionTrigger.displayName = "AccordionTrigger";

export interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
}

export const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ value, className, children, ...props }, ref) => {
    const context = useContext(AccordionContext);
    const itemValue = useContext(AccordionItemContext);
    if (!context) throw new Error("AccordionContent must be used within Accordion");

    const effectiveValue = value || itemValue;
    const isOpen = context.openItems.includes(effectiveValue);
    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "px-4 pb-4 pt-1 text-xs text-slate-400 leading-relaxed animate-in fade-in duration-150 border-t border-white/[0.04]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AccordionContent.displayName = "AccordionContent";
