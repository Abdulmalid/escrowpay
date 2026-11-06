import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/ui";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        neutral: "bg-slate-800 text-slate-300",
        success: "bg-mint-500/15 text-mint-300",
        warning: "bg-amber-500/15 text-amber-300",
        danger: "bg-red-500/15 text-red-300",
        info: "bg-sky-500/15 text-sky-300",
        simulated: "bg-amber-500/15 text-amber-300 border border-dashed border-amber-500/40",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
