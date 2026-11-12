import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/primitives";
import { safeNextPath } from "@/domain/text";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Sign In" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const nextPath = safeNextPath(params.next, "/portal");
  if (user) redirect(nextPath);

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <Card className="p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--stadium-blue)]">
          Member Access
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--navy-900)]">Sign in to Stadium Portal</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Coordinate badminton games, check live courts, and manage your stadium membership.
        </p>
        <div className="mt-6">
          <LoginForm nextPath={nextPath} />
        </div>
      </Card>
    </div>
  );
}
