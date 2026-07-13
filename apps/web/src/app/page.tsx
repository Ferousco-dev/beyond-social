import { type ReactNode } from "react";

import styles from "./page.module.css";

interface StackEntry {
  readonly label: string;
  readonly value: string;
}

const STACK: readonly StackEntry[] = [
  { label: "Frontend", value: "Next.js on Vercel" },
  { label: "API layer", value: "Node.js" },
  { label: "Data", value: "Supabase" },
  { label: "Queue", value: "BullMQ + Redis" },
  { label: "Payments", value: "Stripe + Apple Pay" },
  { label: "Publishing", value: "Upload-post" },
];

export default function HomePage(): ReactNode {
  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Beyond Social</p>
        <h1 className={styles.title}>Foundation ready.</h1>
        <p className={styles.subtitle}>
          The monorepo scaffold is in place: strict TypeScript, linting, and a typed environment
          boundary across the web app and background worker. Feature work begins on the video
          engine.
        </p>

        <a className={styles.pill} href="/api/health">
          <span className={styles.dot} aria-hidden="true" />
          Web service healthy
        </a>

        <dl className={styles.stack}>
          {STACK.map((entry) => (
            <div className={styles.stackItem} key={entry.label}>
              <dt className={styles.stackLabel}>{entry.label}</dt>
              <dd className={styles.stackValue}>{entry.value}</dd>
            </div>
          ))}
        </dl>

        <p className={styles.footer}>
          Health endpoint: <span className={styles.code}>GET /api/health</span>
        </p>
      </div>
    </main>
  );
}
