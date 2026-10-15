import { type Metadata } from "next";
import { type ReactNode } from "react";

import { NewVideoStart } from "@/features/new-video/components/new-video-start";

export const metadata: Metadata = { title: "New video" };

export default function NewVideoPage(): ReactNode {
  return <NewVideoStart />;
}
