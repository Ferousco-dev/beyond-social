import { type Route } from "next";

export interface DocLink {
  readonly label: string;
  readonly href: Route;
}

export interface DocSection {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly paragraphs: readonly string[];
  readonly links: readonly DocLink[];
}
