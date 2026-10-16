import { type DocSection } from "./types";

export const SETUP_SECTIONS: readonly DocSection[] = [
  {
    id: "overview",
    title: "How the product fits together",
    summary: "Three parts, and you only ever touch one of them.",
    paragraphs: [
      "The website is only screens and requests. The Go API does all the real work: it holds the provider keys, charges credits, calls the video, voice and language services, and talks to Stripe. Supabase stores the data and the files.",
      "You never edit the server. Every key, price and limit is set in this console, and a change applies without a redeploy. Only ADMIN_EMAILS, the database and the encryption key live on the host.",
    ],
    links: [{ label: "Setup checklist", href: "/dashboard/admin/setup" }],
  },
  {
    id: "setup",
    title: "First-time setup",
    summary: "What to do, in order, before real users arrive.",
    paragraphs: [
      "Open the Setup checklist. Each row shows whether a key is present and working. Work down the list: language model, video, avatars, trend scraping, then payments, email and alerts.",
      "Set the encryption key on the host first. Without it the console cannot store keys. Then add your own email to ADMIN_EMAILS so you become an admin when you sign in.",
    ],
    links: [
      { label: "Setup checklist", href: "/dashboard/admin/setup" },
      { label: "Provider keys", href: "/dashboard/admin/providers" },
    ],
  },
  {
    id: "providers",
    title: "Provider keys",
    summary: "Where every secret is pasted, and how to know it works.",
    paragraphs: [
      "Paste a key and save. It is encrypted before it is stored and is never shown again, only whether it is set. Each key has a Test button that makes a harmless call to the provider and reports the result.",
      "This page covers the language model, the video service, the voice service (ElevenLabs for cloning and speech), trend scraping, Stripe, Resend for email, and the alert webhook. A key pasted here overrides one set on the host.",
      "For ElevenLabs: create an account at elevenlabs.io, copy an API key, and paste it here. Cloning needs a Creator plan or higher on their side; without it, voice creation is refused and the app says so. Rotate a key by pasting a new one. If a provider key stops working, the Alerts page tells you.",
    ],
    links: [
      { label: "Provider keys", href: "/dashboard/admin/providers" },
      { label: "Alerts", href: "/dashboard/admin/alerts" },
    ],
  },
  {
    id: "models",
    title: "Models",
    summary: "Choose which language model answers each job.",
    paragraphs: [
      "Chat and the editor assistant can each use a different model through OpenRouter. Video and anything that reads media always uses Gemini. Switching a model takes effect on the next message.",
      "If the editor assistant or chat answers with an error, check here that the model name is valid and that its key is set.",
    ],
    links: [{ label: "Models", href: "/dashboard/admin/models" }],
  },
  {
    id: "alerts",
    title: "Alerts",
    summary: "How you find out something broke before users do.",
    paragraphs: [
      "The API records an alert when a provider runs out of credit or a key stops working. Alerts are always stored here. Add a Slack or Discord webhook under Provider keys to also have them posted to a channel.",
    ],
    links: [
      { label: "Alerts", href: "/dashboard/admin/alerts" },
      { label: "Provider keys", href: "/dashboard/admin/providers" },
    ],
  },
];
