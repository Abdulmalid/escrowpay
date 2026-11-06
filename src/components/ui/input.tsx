import * as React from "react";
import { cn } from "@/lib/ui";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-slate-700 bg-abyss-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-mint-500 focus:outline-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400", className)}
      {...props}
    />
  );
}

export { Input };
