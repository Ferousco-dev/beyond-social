import { type ReactNode } from "react";

/**
 * A dense data table. Horizontal scroll lives on the wrapper so one long error
 * string cannot widen the page, and the caption is always present for screen
 * readers even though it is not drawn.
 */

export function Table({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}): ReactNode {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, numeric }: { children: ReactNode; numeric?: boolean }): ReactNode {
  return (
    <th
      scope="col"
      className={`border-b border-hairline py-2 text-xs font-normal text-ink-soft ${
        numeric ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  numeric,
  muted,
}: {
  children: ReactNode;
  numeric?: boolean;
  muted?: boolean;
}): ReactNode {
  return (
    <td
      className={`border-b border-hairline py-2 align-top ${numeric ? "text-right tabular-nums" : ""} ${
        muted ? "text-ink-soft" : "text-ink"
      }`}
    >
      {children}
    </td>
  );
}
