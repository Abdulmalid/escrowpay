import * as React from "react";
import { cn } from "@/lib/ui";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-slate-700 bg-abyss-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-mint-500 focus:outline-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
