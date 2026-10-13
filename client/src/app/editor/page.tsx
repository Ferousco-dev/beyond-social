import { type Route } from "next";
import { redirect } from "next/navigation";

// Projects belong to chats and open from a chat's "Open editor" button.
export default function EditorIndexPage(): never {
  redirect("/dashboard/c/new" as Route);
}
