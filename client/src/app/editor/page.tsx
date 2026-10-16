import { redirect } from "next/navigation";

// Editors are the workspace for every video project.
export default function EditorIndexPage(): never {
  redirect("/dashboard/new");
}
