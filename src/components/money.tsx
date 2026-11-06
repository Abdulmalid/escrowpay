import { formatMoney } from "@/lib/money";

export function Money({
  minor,
  currency,
  className,
}: {
  minor: number | bigint;
  currency: string;
  className?: string;
}) {
  return <span className={className}>{formatMoney(minor, currency)}</span>;
}
