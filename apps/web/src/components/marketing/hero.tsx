import { ArrowRight, Sparkles } from "lucide-react";
import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Container } from "./container";
import { HeroPreview } from "./hero-preview";

export function Hero(): ReactNode {
  return (
    <section id="top" className="border-b border-border">
      <Container className="pb-16 pt-14 sm:pb-24 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge>
            <Sparkles className="size-3.5 text-primary" />
            AI video for social teams
          </Badge>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            From an idea to published video, without the production.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Beyond Social turns a conversation into ultra-realistic short-form videos, then
            captions, schedules, and publishes them across every platform.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href="#pricing">
                Start creating
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#ai-workflow">See how it works</a>
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-4xl">
          <HeroPreview />
        </div>
      </Container>
    </section>
  );
}
