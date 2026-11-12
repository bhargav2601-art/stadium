import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AlertBanner, Card } from "@/components/ui/primitives";
import { formatInr } from "@/lib/format";
import { getCurrentUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Join Stadium" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/portal");
  const settings = await getSettings();
  const initialFee = formatInr(Number(settings["membership.initial_paise"]));
  const monthlyFee = formatInr(Number(settings["membership.monthly_paise"]));

  return (
    <div className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--stadium-blue)]">
          New Membership
        </p>
        <h1 className="text-3xl font-bold text-[var(--navy-900)]">Join Anil Kumble Stadium</h1>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Create your member profile first, then activate membership online or via desk/UPI verification.
        </p>
        <AlertBanner
          tone="info"
          title={`All-inclusive access: ${initialFee} initial · ${monthlyFee}/month`}
          body="No hourly charges, no per-game fees, and no additional badminton court fees."
        />
      </div>

      <Card className="p-6 sm:p-8 lg:col-span-3">
        <RegisterForm />
      </Card>
    </div>
  );
}
