/**
 * The small pointers that show somebody a control they have not found.
 *
 * Deliberately few, and each one earns its place by pointing at something that
 * is genuinely hard to discover: an icon button with no label, a destination in
 * a sidebar somebody has never opened. A tip in front of a control that already
 * explains itself is an interruption charging rent.
 *
 * Every tip is anchored to a real element by `anchor`, matched on
 * `data-tip-anchor`. Nothing is shown when the element is not on screen, so a
 * tip cannot end up pointing at empty space on a layout that changed.
 *
 * Each is shown once. Dismissal is per device, like the checklist: this is a
 * fact about whether a browser has seen something, not about the person.
 */

export const TIP_IDS = ["attach", "discover"] as const;

export type TipId = (typeof TIP_IDS)[number];

export interface Tip {
  readonly id: TipId;
  /** Matched against `data-tip-anchor` on the element being pointed at. */
  readonly anchor: string;
  readonly title: string;
  readonly body: string;
  /** Which side of the anchor the card sits on. */
  readonly side: "top" | "right";
}

export const TIPS: Readonly<Record<TipId, Tip>> = {
  attach: {
    id: "attach",
    anchor: "compose-plus",
    title: "Add a photo or your voice",
    // Names the payoff rather than the mechanism. "Opens the attachment menu"
    // describes the button; this says why anyone would press it.
    body: "Photos become the footage, and a saved voice makes the video sound like you.",
    side: "top",
  },
  discover: {
    id: "discover",
    anchor: "nav-discover",
    title: "Stuck for an idea?",
    body: "Search TikTok for what is working in your industry and build from a real post.",
    side: "right",
  },
};
