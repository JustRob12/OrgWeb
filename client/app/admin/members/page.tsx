import { redirect } from "next/navigation";

export default function MembersPageRedirect() {
  redirect("/admin/members/view");
}
