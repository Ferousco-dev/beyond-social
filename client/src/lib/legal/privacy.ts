import { type LegalDocument } from "./schema";

export const PRIVACY: LegalDocument = {
  status: "draft",
  title: "Privacy policy",
  summary: "What we collect, why, who helps us, and how to have it erased.",
  body: `## What we collect

Your account details: your name, your email address and a password, which is kept by our sign-in provider and never visible to us.

What you give the service: the prompts and messages you write, files you upload such as pictures, sounds and videos, avatar recordings of your face and voice, the projects you edit, and the accounts you connect for publishing.

How you use it: which actions you run, when, and how much of your credits or usage limits they use, so we can charge fairly and keep the service safe.

Payment details are entered on Stripe's own page. We receive only what Stripe tells us: that a payment was made, its amount and a reference. We never receive your card number.

## Why we use it

To run the service you asked for, to bill you, to keep the service secure and prevent abuse, to answer your questions, and to send emails about your account such as receipts, billing problems and usage limits. We do not sell your personal information and we do not use your private content to train our own models.

## Who helps us

We use other companies to do parts of the work, and they receive only what that work needs: Supabase for sign-in, the database and file storage, Stripe for payments, Google Gemini and OpenRouter for language and video understanding, KIE for video generation, HeyGen for avatars, Apify for finding public videos, Resend for sending email, and the platforms you choose to publish to. Each handles data under its own terms.

## How long we keep it

Your content stays while your account is open. When you delete your account we erase what you made, including videos, avatars, recordings and chats, and your avatar is removed at HeyGen. We keep payment, invoice and credit records for as long as accounting and the law require, and they are no longer linked to your name or email once the account is deleted.

## Your choices

You can change your name and password and delete your account under Settings. You can disconnect a connected account at any time. You can ask us what we hold about you, or to correct or erase it, by writing to hello@beyondsocial.app.

## Cookies and storage

We use only what is needed: a session cookie to keep you signed in and a setting that remembers whether you prefer a light or dark theme. We do not use advertising cookies.

## Security

Provider keys and connected account tokens are encrypted. Access to your data is limited to you and to the people who run the service when they must. No system is perfectly secure, so please use a strong, unique password.

## Children

The service is not for children under 13, and we do not knowingly collect their information.

## Changes and contact

We may update this policy. If a change matters, we will tell you. Questions: hello@beyondsocial.app.`,
};
