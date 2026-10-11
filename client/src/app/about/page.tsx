import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Building Beyond Social" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Company"
      title="Building Beyond Social"
      lede="Beyond Social turns an idea into a finished, publishable video. This page explains what it is for and why it is built the way it is."
    >
      <Prose>
        <p>
          The product is for people who have something to say and no crew to say it with. A founder
          explaining what they built, a small brand that needs a week of posts, someone who can
          write a good sentence but has never lit a scene. The work they need done is not hard to
          imagine. It is hard to execute.
        </p>
        <p>
          Video models have got very good at the execution and stayed poor at the imagining. Ask one
          for a video of a coffee shop and you get a coffee shop: correctly rendered, evenly lit,
          shot from nowhere in particular. Nothing is wrong with it. Nothing was decided about it
          either. That gap is not a limit of the model. It is a limit of what the prompt asked for.
        </p>
        <p>
          So Beyond Social pairs the generation model with a curated knowledge base of
          cinematography, lighting, pacing, and platform craft. Before a shot is generated, the
          relevant parts of that knowledge are retrieved and used to make the decisions a director
          would make: focal length, time of day, where the camera sits, how long it holds, when to
          cut. The user still says what the video is about. The system supplies the vocabulary they
          were never expected to have.
        </p>
        <p>
          We built it this way because prompt quality dominates output quality, and prompt quality
          is mostly specific knowledge. A person who knows to ask for an 85mm at golden hour with a
          slow push in gets a different video from a person who asks for a nice shot, using the same
          model on the same day. Encoding that knowledge once is more useful than asking every user
          to acquire it.
        </p>
        <p>
          Platform craft is part of the same argument. A vertical opening that has to earn a second
          of attention is not the same edit as a wide one that can breathe, and a caption written
          for search is not a caption written for a feed. Those are learnable rules, so they live in
          the knowledge base too rather than in the user&apos;s head.
        </p>
        <p>
          The product is in active development and we are not promising a date. If you want to
          follow the work or push it in a particular direction, get in touch.
        </p>
      </Prose>
    </PageShell>
  );
}
