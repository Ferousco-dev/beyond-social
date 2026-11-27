import { type LegalDocument } from "./schema";

export const PRIVACY: LegalDocument = {
  status: "draft",
  title: "Privacy policy",
  updated: "27 November 2026",
  summary: "What we collect, why, who helps us, how long we keep it, and how to have it erased.",
  body: `## What we collect

Your account details: your name, your email address and a password, which is kept by our sign-in provider and never visible to us. If you add them at sign-up, also your phone number, business name and industry.

What you give the service: the ideas, prompts and messages you write, files you upload such as pictures, sounds and videos, the projects you edit, and the accounts you connect for publishing.

Your face and voice, if you make an avatar. A recording of your face and a short recording of your voice are used only to make videos in which your avatar speaks the scripts you choose. They are never used for anything else, never shown to other people, and you can delete them at any time.

How you use it: which actions you run, when, and how many credits or how much of your usage limits they use, so we can charge fairly, refund failed actions and keep the service safe.

How your posts perform: for posts we publish for you, we read the public numbers the platform makes available, such as views and likes, to suggest the best time for your next post. Today only YouTube provides these numbers. TikTok and Instagram do not, so for them we use general guidance instead.

Payment details are entered on Stripe's own page. We receive only what Stripe tells us: that a payment was made, its amount and a reference. We never receive your card number.

## Why we use it

To run the service you asked for, to bill you and refund actions that fail, to keep the service secure and prevent abuse, to answer your questions, and to send emails about your account. Those emails are receipts, billing problems, usage limits and, if you turn them on under Settings, Notifications, a message when your video is ready or could not be made.

We do not sell your personal information, we do not show you advertising, and we do not use your private content to train our own models.

## Who helps us

We use other companies to do parts of the work, and each receives only what that work needs:

Supabase for sign-in, the database and file storage. Render and Vercel, which host the service. Stripe for payments. Google Gemini, which writes and refines scripts, fills in your video, writes captions and post text, and watches clips when you ask the editor to. KIE, which makes the videos, the talking avatars and the voiceovers. Apify, which finds public posts when you search what is trending. Resend, which sends our emails. And the platforms you choose to publish to: TikTok, Instagram and YouTube.

When our AI writes or fills in something for you, it receives your words and, where needed, the pictures or video you attached. To pick assets for a video it receives only their labels and group names, not the files. When a video is made, the provider is given a private link to the files it needs, and the link stops working after six hours. Each provider handles data under its own terms.

## Connected accounts

When you connect TikTok, Instagram or YouTube, the platform gives us a token that lets us publish for you. We store it encrypted and use it only to post what you approve, at the time you approve, and to read your posts' public numbers as described above. You can disconnect at any time under Settings, Connections, and we stop using the token at once.

## How long we keep it

Your content stays while your account is open, and you can delete any item yourself at any time. Records of what the service did for you, such as which actions ran and how many credits they used, are kept for 13 months and then deleted automatically.

When you delete your account we erase what you made, including videos, recordings, avatars, assets, groups and chats, usually within minutes. We keep payment, invoice and credit records for as long as accounting and the law require, and they are no longer linked to your name or email once the account is deleted.

## Your choices

You can change your name and password and delete your account under Settings, Account. You can turn emails about your videos on or off under Settings, Notifications. You can disconnect a connected account at any time. You can ask us for a copy of what we hold about you, or to correct or erase it, by writing to hello@beyondsocial.app from the email on your account. We answer within 30 days.

## Cookies and storage on your device

We use one kind of cookie: the one that keeps you signed in. We do not use advertising or tracking cookies.

Your browser also keeps a few things on your device to save you time, such as an unfinished video form, a script written for a length you may switch back to (for 30 minutes), your recent searches, your light or dark theme, and which tips you have already seen. They stay on your device and you can clear them in your browser at any time.

## Security

Connected account tokens and provider keys are encrypted. Files are stored privately and shared only through links that expire. Access to your data is limited to you and to the people who run the service when they must. No system is perfectly secure, so please use a strong password you do not use anywhere else.

## Children

The service is not for children under 13, and we do not knowingly collect their information.

## Changes and contact

We may update this policy. The date at the top shows when it last changed, and if a change matters we will tell you before it applies. Questions: hello@beyondsocial.app.`,
};
