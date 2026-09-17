import { Skeleton } from "@/components/ui/skeleton";
import { getUserCreditSpendByModel, getUserCreditSpendDaily } from "@/lib/dashboard/admin";
import { TrendChart } from "@/features/admin/components/trend-chart";
import { CreditSpendTable } from "@/features/admin/components/credit-spend-table";

export function SpendSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

/** Credit spend over the window: a timeline (TrendChart, the same component
 * Analytics uses — no second chart implementation) plus a by-model
 * breakdown, mirroring the platform-wide AiSpendTable's shape for one user. */
export async function UserSpendSection({ userId, days }: { userId: string; days: number }) {
  const [daily, byModel] = await Promise.all([
    getUserCreditSpendDaily(userId, days),
    getUserCreditSpendByModel(userId, days),
  ]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-hairline bg-paper p-5">
        <h3 className="text-sm font-semibold text-ink">Credits spent per day</h3>
        <div className="mt-4">
          <TrendChart
            series={[
              {
                label: "Credits spent",
                color: "primary",
                fill: true,
                points: daily.map((p) => ({ day: p.day, value: p.creditsSpent })),
              },
            ]}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Spend by model</h3>
        <CreditSpendTable rows={byModel} />
      </div>
    </div>
  );
}
