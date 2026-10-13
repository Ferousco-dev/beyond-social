import { type Metadata } from "next";

import { AuthHeader } from "@/features/auth/components/auth-header";

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
          Your videos, avatars, connected accounts and files are being permanently erased, and this
          cannot be undone. Payment and invoice records are kept because the law requires it.
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        Questions about your data? Email{" "}
        <a
          href="mailto:support@beyondsocial.app?subject=Deleted%20account"
          className="font-medium text-primary hover:underline"
        >
          support@beyondsocial.app
        </a>{" "}
        from the address on the account.
      </p>
    </div>
  );
}
