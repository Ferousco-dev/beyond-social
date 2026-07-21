import { ArrowRight } from "lucide-react";
import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { Section } from "./section";

export function FinalCta(): ReactNode {
  return (
    <Section className="border-t border-border">
      <div className="rounded-3xl border border-border bg-card px-6 py-16 text-center sm:px-12">
        <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Start creating videos your audience will actually watch
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-pretty text-lg text-muted-foreground">
          Your first 15 videos are free. No credit card, no editing software, no crew.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <a href="#pricing">
              Start creating
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#features">Explore features</a>
          </Button>
        </div>
      </div>
    </Section>
  );
}
