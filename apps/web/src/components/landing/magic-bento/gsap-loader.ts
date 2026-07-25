// Type-only import: erased at build time, so GSAP itself stays lazily loaded.
import type { gsap as GsapNamespace } from "gsap";

export type Gsap = typeof GsapNamespace;

let loader: Promise<Gsap> | null = null;

/**
 * Loads GSAP at most once, on demand. The bento effects are decorative and
 * disabled on small screens, so importing the library eagerly would ship it to
 * readers who never see the animation.
 */
export function loadGsap(): Promise<Gsap> {
  loader ??= import("gsap").then((module) => module.gsap);
  return loader;
}

/** Brand accent as raw RGB channels, so it can be composed into rgba(). */
export const GLOW_RGB = "59, 130, 246";
export const MOBILE_BREAKPOINT = 768;
export const DEFAULT_PARTICLES = 8;
export const DEFAULT_SPOTLIGHT_RADIUS = 320;
