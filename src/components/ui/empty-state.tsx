import * as React from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-700 px-6 py-12 text-center">
      <Inbox className="size-8 text-slate-600" />
      <p className="font-display text-sm font-semibold text-slate-200">{title}</p>
      {description ? <p className="max-w-sm text-sm text-slate-400">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
