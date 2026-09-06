import { redirect } from "next/navigation";

/** Legacy path — staff management now lives at /staff. */
export default function StaffInviteRedirectPage() {
  redirect("/staff");
}
