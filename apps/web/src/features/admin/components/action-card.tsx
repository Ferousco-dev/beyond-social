import { type ReactNode } from "react";

/** Common shell for the account-action forms on the user detail page. */
export function ActionCard({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-paper p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-xs text-ink-soft">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
