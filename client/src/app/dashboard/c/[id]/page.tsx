import { redirect } from "next/navigation";

/** Chat is retired. Video creation now begins with a structured New Video flow. */
export default function ConversationPage(): never {
  redirect("/dashboard/new");
}
