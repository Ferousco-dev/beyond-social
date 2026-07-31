import { type Metadata } from "next";

import { AuthHeader } from "@/features/auth/components/auth-header";
import { DELETION_GRACE_PERIOD_DAYS } from "@/lib/account/types";

export const metadata: Metadata = { title: "Account deleted" };

export default function AccountDeletedPage() {
  return (
    <div className="flex flex-col gap-6">
      <AuthHeader
        title="Your account has been deleted"
        subtitle="You have been signed out, and you can no longer sign in with this account."
      />

      <div className="rounded-xl border border-border/60 p-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          Nothing you made has been destroyed. It is kept for {DELETION_GRACE_PERIOD_DAYS} days, and
          during that window an administrator can restore your account exactly as you left it.
        </p>
        <p className="mt-3">
          After {DELETION_GRACE_PERIOD_DAYS} days the account becomes eligible for permanent
          removal, and a restore is no longer possible.
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        Changed your mind? Email{" "}
        <a
          href="mailto:support@beyondsocial.app?subject=Account%20restoration%20request"
          className="font-medium text-primary hover:underline"
        >
          support@beyondsocial.app
        </a>{" "}
        from the address on the account and ask for it to be restored. Say when you deleted it, so
        it can be found before the window closes.
      </p>
    </div>
  );
}
