import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CreditsForm } from "@/features/admin/components/credits-form";
import { PlanForm } from "@/features/admin/components/plan-form";
import { SuspensionForm } from "@/features/admin/components/suspension-form";
import { getUserDetail } from "@/lib/dashboard/admin";

export const metadata: Metadata = { title: "Admin · User detail" };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUserDetail(id);
  if (!user) notFound();

  return (
    <div>
      <Link
        href="/dashboard/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Users
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        {user.fullName ?? user.email ?? user.id}
      </h1>
      {user.suspendedAt && (
        <p className="mt-1 text-sm text-destructive">
          Suspended {new Date(user.suspendedAt).toLocaleDateString()} by{" "}
          {user.suspendedByEmail ?? "unknown"} — {user.suspendedReason}
        </p>
      )}

      <dl className="mt-6 grid gap-4 rounded-xl border border-hairline bg-paper p-5 sm:grid-cols-3">
        <Field label="Email" value={user.email ?? "—"} />
        <Field label="Plan" value={user.plan ?? "—"} />
        <Field label="Role" value={user.role ?? "—"} />
        <Field label="Credits" value={`${user.creditsUsed} / ${user.creditsTotal}`} />
        <Field label="Projects" value={String(user.projectCount)} />
        <Field label="Generations" value={String(user.generationCount)} />
        <Field label="Messages" value={String(user.messageCount)} />
        <Field label="Signed up" value={new Date(user.createdAt).toLocaleString()} />
        <Field
          label="Last active"
          value={user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : "Never"}
        />
        <Field
          label="Subscription"
          value={
            user.subscriptionStatus
              ? `${user.subscriptionPlan ?? "—"} (${user.subscriptionStatus})`
              : "None"
          }
        />
        <Field
          label="Renews / ends"
          value={
            user.subscriptionPeriodEnd
              ? `${new Date(user.subscriptionPeriodEnd).toLocaleDateString()}${
                  user.subscriptionCancelAtPeriodEnd ? " (cancels)" : ""
                }`
              : "—"
          }
        />
      </dl>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <CreditsForm userId={user.id} creditsTotal={user.creditsTotal} creditsUsed={user.creditsUsed} />
        <PlanForm userId={user.id} plan={user.plan} creditsTotal={user.creditsTotal} />
        <SuspensionForm userId={user.id} suspended={user.suspendedAt !== null} />
      </div>
    </div>
  );
}
