"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Typewriter that cycles a list of phrases (ported from React Bits TextType).
 *
 * The cursor blinks with a CSS keyframe rather than GSAP, so the hero does not
 * pull an animation library into its critical path. Under
 * `prefers-reduced-motion` the first phrase is shown in full and never animates.
 */

interface TextTypeProps {
  /** Phrases to cycle through. */
  text: readonly string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  /** How long a completed phrase holds before deleting. */
  pauseDuration?: number;
  initialDelay?: number;
  showCursor?: boolean;
  cursorCharacter?: string;
  className?: string;
  cursorClassName?: string;
}

export function TextType({
  text,
  typingSpeed = 65,
  deletingSpeed = 30,
  pauseDuration = 1800,
  initialDelay = 400,
  showCursor = true,
  cursorCharacter = "|",
  className,
  cursorClassName,
}: TextTypeProps) {
  const phrases = useMemo(() => (text.length > 0 ? text : [""]), [text]);
  const [reduced, setReduced] = useState(true);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState("");
  const [deleting, setDeleting] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduced) return;

    const phrase = phrases[index] ?? "";
    let timer: number;

    if (!deleting && shown === phrase) {
      // Hold the finished phrase, then start deleting.
      timer = window.setTimeout(() => setDeleting(true), pauseDuration);
    } else if (deleting && shown === "") {
      setDeleting(false);
      setIndex((current) => (current + 1) % phrases.length);
      return;
    } else {
      const delay = started.current ? (deleting ? deletingSpeed : typingSpeed) : initialDelay;
      started.current = true;
      timer = window.setTimeout(() => {
        setShown((current) =>
          deleting ? current.slice(0, -1) : phrase.slice(0, current.length + 1),
        );
      }, delay);
    }

    return () => window.clearTimeout(timer);
  }, [
    shown,
    deleting,
    index,
    phrases,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    initialDelay,
    reduced,
  ]);

  const visible = reduced ? (phrases[0] ?? "") : shown;

  return (
    <span className={className}>
      {visible}
      {showCursor && !reduced ? (
        <span
          aria-hidden
          // `inline`, not `inline-block`: an inline-block caret grows the line
          // box and pushes the following copy down.
          className={cn(
            "ml-1 inline motion-safe:animate-[blink_1s_steps(1)_infinite]",
            cursorClassName,
          )}
        >
          {cursorCharacter}
        </span>
      ) : null}
    </span>
  );
}
