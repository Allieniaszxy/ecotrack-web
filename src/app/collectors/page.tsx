import { redirect } from "next/navigation";

// The old unprotected collectors page now lives inside the admin portal.
export default function LegacyCollectorsPage() {
  redirect("/admin/collectors");
}
