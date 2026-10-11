"use client";

import { Download } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { exportAnalyticsAction, type AnalyticsExport } from "../actions/export-analytics";

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvSection(title: string, header: string[], rows: (string | number)[][]): string {
  const lines = [`# ${title}`, header.join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  return lines.join("\n");
}

function toCsv(data: AnalyticsExport): string {
  return [
    csvSection(
      "Totals",
      ["metric", "value"],
      [
        ["Total users", data.totals?.totalUsers ?? ""],
        ["Active subscriptions", data.totals?.activeSubscriptions ?? ""],
        ["Window (days)", data.days],
      ],
    ),
    csvSection(
      "Plan breakdown",
      ["plan", "subscriptions", "trialing"],
      data.plans.map((p) => [p.plan, p.subscriptions, p.trialing]),
    ),
    csvSection(
      "Daily series",
      ["day", "signups", "dau", "mau", "generations_succeeded", "generations_failed", "ai_spend_usd"],
      data.daily.map((r) => [
        r.day,
        r.signups,
        r.dau,
        r.mau,
        r.generationsSucceeded,
        r.generationsFailed,
        r.aiSpendUsd.toFixed(4),
      ]),
    ),
    csvSection(
      "AI spend by model",
      ["provider", "model", "calls", "cost_usd", "input_tokens", "output_tokens", "failed_calls"],
      data.spendByModel.map((m) => [
        m.provider,
        m.model,
        m.calls,
        m.costUsd.toFixed(4),
        m.inputTokens,
        m.outputTokens,
        m.failedCalls,
      ]),
    ),
  ].join("\n\n");
}

function download(filename: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Downloads the full analytics dataset for the selected window, client-side. */
export function AnalyticsExportButtons({ days }: { readonly days: number }) {
  const [pending, startTransition] = useTransition();

  function runExport(format: "csv" | "json") {
    startTransition(() => {
      void exportAnalyticsAction(days).then((data) => {
        const stamp = new Date().toISOString().slice(0, 10);
        if (format === "csv") {
          download(`analytics-${days}d-${stamp}.csv`, toCsv(data), "text/csv");
        } else {
          download(`analytics-${days}d-${stamp}.json`, JSON.stringify(data, null, 2), "application/json");
        }
      });
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => runExport("csv")}
      >
        <Download className="size-3.5" aria-hidden />
        {pending ? "Preparing…" : "Export CSV"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => runExport("json")}
      >
        Export JSON
      </Button>
    </div>
  );
}
