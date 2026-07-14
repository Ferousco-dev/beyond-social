import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { FOOTER_COLUMNS } from "@/lib/marketing/site";

import { Container } from "./container";
import { ThemeToggle } from "./theme-toggle";

export function SiteFooter(): ReactNode {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Idea to published short-form video, powered by AI. Create, edit, schedule, and publish
              from one workspace.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="text-sm font-semibold">{column.title}</h4>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2026 Beyond Social. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </Container>
    </footer>
  );
}
