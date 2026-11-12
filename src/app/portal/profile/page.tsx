import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { ProfileClient } from "@/components/portal/ProfileClient";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "My Profile" };

export default async function PortalProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal/profile");

  return (
    <PortalShell
      section="member"
      title="My Profile & Player Preferences"
      subtitle="Keep your badminton skill level, playing schedule, and availability indicator updated."
    >
      <ProfileClient
        user={{
          name: user.name,
          email: user.email,
          phone: user.phone,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
        }}
        profile={{
          skillLevel: user.playerProfile?.skillLevel ?? "BEGINNER",
          preferredGame: user.playerProfile?.preferredGame ?? "DOUBLES",
          preferredTime: user.playerProfile?.preferredTime ?? "BOTH",
          playStyle: user.playerProfile?.playStyle ?? "CASUAL",
          sports: user.playerProfile?.sports ?? ["badminton"],
          availableNow: user.playerProfile?.availableNow ?? false,
          intro: user.playerProfile?.intro ?? null,
        }}
      />
    </PortalShell>
  );
}
