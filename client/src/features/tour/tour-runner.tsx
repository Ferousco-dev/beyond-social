"use client";

import "driver.js/dist/driver.css";
import "./tour.css";

import { driver, type Driver } from "driver.js";
import { type Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { hideCursor, showCursor } from "./cursor";
import { TOURS, pageRun, pageStart, parseProgress, type TourId, type TourProgress } from "./steps";

const REPLAY_EVENT = "bs:tour-replay";
const key = (tour: TourId): string => `bs:tour:${tour}`;

/** The old walkthrough's record: anyone who finished it has already been shown around. */
const LEGACY_KEY = "bs:tutorials:v1";
const LEGACY_TRACK: Readonly<Record<TourId, string>> = { "first-video": "dashboard", editor: "editor" };

function read(tour: TourId): TourProgress {
  try {
    const saved = parseProgress(window.localStorage.getItem(key(tour)));
    if (saved) return saved;
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_KEY) ?? "{}") as { completed?: unknown };
    const finishedOld = Array.isArray(legacy.completed) && legacy.completed.includes(LEGACY_TRACK[tour]);
    return { step: 0, done: finishedOld };
  } catch {
    // Without storage the tour would start on every visit, which is worse than never.
    return { step: 0, done: true };
  }
}

function write(tour: TourId, progress: TourProgress): void {
  try {
    window.localStorage.setItem(key(tour), JSON.stringify(progress));
  } catch {
    // Private browsing: the tour simply does not remember.
  }
}

/** Starts a tour again from its first step, opening the page it starts on. */
export function replayTour(tour: TourId): void {
  write(tour, { step: 0, done: false });
  window.dispatchEvent(new CustomEvent<TourId>(REPLAY_EVENT, { detail: tour }));
}

/**
 * Runs a guided tour: the page dims, the next thing to tap sits in a bright
 * spotlight, and a card beside it says what to do, with Skip always there.
 * Steps on other pages wait until the person gets there.
 */
export function TourRunner({ tour }: { tour: TourId }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = useRef<Driver | null>(null);
  // Changes when the tour is replayed, so the effect below starts it over.
  const [replays, setReplays] = useState(0);

  useEffect(() => {
    const steps = TOURS[tour];
    const progress = read(tour);
    if (progress.done) return;
    const run = pageRun(steps, pageStart(steps, progress.step), pathname);
    if (!run) {
      // A replay from another page goes to where the tour starts.
      if (replays > 0 && progress.step === 0) router.push(steps[0]!.page as Route);
      return;
    }
    const [first, last] = run;
    let skipped = false;

    const instance = driver({
      animate: true,
      smoothScroll: true,
      overlayColor: "#08080b",
      overlayOpacity: 0.62,
      stagePadding: 8,
      stageRadius: 14,
      popoverOffset: 14,
      popoverClass: "bs-tour",
      allowClose: false,
      overlayClickBehavior: "none",
      // Arrow keys would move the tour while someone types their idea.
      allowKeyboardControl: false,
      waitForElement: 5000,
      showProgress: false,
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Got it",
      steps: steps.slice(first, last + 1).map((step, offset) => ({
        element: `[data-tour="${step.target}"]`,
        advanceOnClick: step.clickToContinue === true,
        onHighlighted: (element) => {
          write(tour, { step: first + offset, done: false });
          if (step.clickToContinue && element) showCursor(element);
          else hideCursor();
          // A sheet that is still sliding in moves its contents; measure again once it settles.
          window.setTimeout(() => instance.refresh(), 350);
        },
        popover: {
          title: step.title,
          description: step.body,
          side: step.side,
          align: "center",
          // Back only where the step before is still on screen to go back to.
          showButtons: step.clickToContinue ? [] : offset > 0 && !steps[first + offset - 1]?.clickToContinue ? ["previous", "next"] : ["next"],
          onPopoverRender: (popover) => {
            popover.wrapper.dataset.side = step.side ?? "bottom";
            const count = document.createElement("span");
            count.className = "bs-tour-count";
            count.textContent = `${first + offset + 1} of ${steps.length}`;
            const skip = document.createElement("button");
            skip.type = "button";
            skip.className = "bs-tour-skip";
            skip.textContent = first + offset === steps.length - 1 ? "Close" : "Skip tour";
            skip.addEventListener("click", () => {
              skipped = true;
              instance.destroy();
            });
            const lead = document.createElement("div");
            lead.className = "bs-tour-lead";
            lead.append(count, skip);
            popover.footer.prepend(lead);
            // The library hides the footer when a step has no buttons; Skip must always be there.
            popover.footer.style.display = "flex";
            popover.progress.style.display = "none";
            if (step.clickToContinue) popover.footerButtons.style.display = "none";
          },
        },
      })),
      onDeselected: () => hideCursor(),
      onDestroyed: () => {
        hideCursor();
        active.current = null;
        if (skipped) {
          write(tour, { step: 0, done: true });
          return;
        }
        // Reached the end of this page's steps: the tour is over, or carries on on the next page.
        const next = last + 1;
        write(tour, next >= steps.length ? { step: 0, done: true } : { step: next, done: false });
      },
    });

    active.current = instance;
    // Spotlighting changes the element's attributes, so wait until React owns it:
    // touching server HTML that is still waiting to hydrate makes the two disagree.
    // React marks a hydrated node with a "__reactFiber" key. Gives up after 10s.
    const selector = `[data-tour="${steps[first]!.target}"]`;
    const startedAt = Date.now();
    let timer = 0;
    const start = (): void => {
      const element = document.querySelector(selector);
      const hydrated = element !== null && Object.keys(element).some((name) => name.startsWith("__reactFiber"));
      if (hydrated) timer = window.setTimeout(() => instance.drive(), 400);
      else if (Date.now() - startedAt < 10_000) timer = window.setTimeout(start, 150);
    };
    start();
    return () => {
      window.clearTimeout(timer);
      if (active.current === instance) {
        // Leaving the page mid-tour: keep the place, do not mark it done.
        skipped = false;
        const at = instance.getActiveIndex();
        active.current = null;
        instance.destroy();
        write(tour, { step: at === undefined ? first : first + at, done: false });
      }
    };
  }, [tour, pathname, replays, router]);

  useEffect(() => {
    const onReplay = (event: Event): void => {
      if ((event as CustomEvent<TourId>).detail === tour) setReplays((count) => count + 1);
    };
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_EVENT, onReplay);
  }, [tour]);

  return null;
}

