import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/ui/primitives";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await auth();
  let forced = false;
  if (session?.user?.id) {
    const user = await prisma.user.findFirst({
      where: { id: session.user.id },
      select: { mustChangePassword: true },
    });
    forced = Boolean(user?.mustChangePassword);
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <PageHeader
        title={forced ? "Set a new password" : "Change password"}
        description={
          forced
            ? "You must choose your own password before using the rest of the app."
            : "Update the password you use to sign in to Excellence Kids."
        }
      />
      <ChangePasswordForm forced={forced} />
    </div>
  );
}
