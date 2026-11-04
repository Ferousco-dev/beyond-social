import Image from "next/image";
import { type ReactNode } from "react";

import { FEATURES } from "@/lib/marketing/landing";

import styles from "./feature-grid.module.css";

/** The intrinsic size of the peek screenshots in `public/app`. */
const PEEK_WIDTH = 1000;
const PEEK_HEIGHT = 579;

/**
 * The capabilities grid.
 *
 * This was a port of React Bits' MagicBento: a spotlight following the cursor
 * across the section, particles drifting inside the hovered card, tilt,
 * magnetism, and a border that lit up toward the pointer. All of it needed GSAP,
 * a client component, and four hook files, and none of it said anything about
 * the product. It was the same effect layer sitting on every AI landing page
 * that year, and the cards underneath were already carrying the argument.
 *
 * What is left is the part that was doing work: an alternating grid so the rows
 * do not read as six identical boxes, and a real screenshot of the product
 * peeking out of each card. The section renders on the server now, and the
 * animation library it depended on is gone from the page entirely.
 */
export function FeatureGrid(): ReactNode {
  return (
    <div className={styles.grid}>
      {FEATURES.map((feature) => (
        <article key={feature.title} className={styles.card}>
          {/* Decoration, so it is hidden from assistive tech and carries no alt
              text: the card's own heading and copy already say what this is, and
              a screen reader announcing "screenshot" here would be noise. */}
          {feature.peek ? (
            <Image
              src={feature.peek.src}
              alt=""
              aria-hidden
              width={PEEK_WIDTH}
              height={PEEK_HEIGHT}
              // Intrinsic size only: the CSS sizes it against the card. Serving
              // it optimised matters because these ride along with a section
              // nobody has scrolled to yet.
              className={styles.peek}
            />
          ) : null}

          <span className={styles.icon}>
            <feature.icon className="size-[18px]" aria-hidden />
          </span>
          <div className={styles.content}>
            <h3 className={styles.title}>{feature.title}</h3>
            <p className={styles.description}>{feature.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
