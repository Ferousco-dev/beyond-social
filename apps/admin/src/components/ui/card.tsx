import { type ReactNode } from "react";

/** A bordered surface holding one panel of figures. */
export function Card({ children }: { children: ReactNode }): ReactNode {
  return <div className="rounded-xl border border-hairline bg-paper px-5 py-4">{children}</div>;
}

/**
 * What a panel shows when its read failed.
 *
 * Never a zero and never an empty list: "nothing happened" and "we could not
 * ask" are opposite answers, and a console that confuses them reports all clear
 * during an outage.
 */
export function Unavailable({ what }: { what: string }): ReactNode {
  return (
    <p className="text-sm text-warning">
      {what} could not be read, so nothing is shown. This is not a report of zero.
    </p>
  );
}
