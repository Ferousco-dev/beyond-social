export interface DashboardUser {
  readonly name: string;
  readonly email: string;
  readonly initials: string;
  readonly avatarUrl: string | null;
  /** Credits left, or null when the balance could not be read just now. */
  readonly credits: number | null;
  readonly plan: "free" | "pro";
  /** Whether the admin console link belongs in this person's account menu. */
  readonly isAdmin: boolean;
}

export interface SidebarProject {
  readonly id: string;
  readonly title: string;
  readonly group: string;
  readonly pinned: boolean;
}

export interface Credits {
  readonly balance: number;
  readonly plan: "free" | "pro";
  /** Where a Pro member stands in the two limits. Null for Free. */
  readonly usage: UsageBars | null;
}

export interface UsageBars {
  readonly fiveHour: { readonly used: number; readonly limit: number; readonly resetsAt: string | null };
  readonly week: { readonly used: number; readonly limit: number; readonly resetsAt: string };
}
