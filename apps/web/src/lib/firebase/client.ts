"use client";

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Analytics, getAnalytics, isSupported, logEvent } from "firebase/analytics";

import { env, isFirebaseConfigured } from "@/lib/env";

/**
 * Firebase Analytics, initialized once and lazily.
 *
 * Client-only: `firebase/analytics` touches `window` at import time, so this
 * module must never be imported from a server component or action. Analytics
 * itself no-ops until `isFirebaseConfigured` is true (Google Analytics linked
 * to the project in console), so every call site here is safe to run
 * unconditionally rather than guarded at every call.
 */

let analyticsPromise: Promise<Analytics | null> | null = null;

function getFirebaseApp(): FirebaseApp {
  const existing = getApps();
  if (existing.length > 0) return existing[0]!;

  return initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  });
}

/**
 * Resolves to the Analytics instance, or null when Firebase is not
 * configured or the browser does not support it (analytics relies on
 * IndexedDB, which some embedded/private contexts refuse).
 */
function analytics(): Promise<Analytics | null> {
  if (!isFirebaseConfigured) return Promise.resolve(null);

  analyticsPromise ??= isSupported().then((supported) =>
    supported ? getAnalytics(getFirebaseApp()) : null,
  );
  return analyticsPromise;
}

/** Logs a Firebase Analytics event. Silently does nothing when unconfigured. */
export function track(eventName: string, params?: Record<string, unknown>): void {
  void analytics().then((instance) => {
    if (instance) logEvent(instance, eventName, params);
  });
}
