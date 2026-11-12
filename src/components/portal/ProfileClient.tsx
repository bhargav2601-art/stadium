"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertBanner, Card } from "@/components/ui/primitives";

type ProfileProps = {
  user: {
    name: string;
    email: string;
    phone: string | null;
    bio: string | null;
    avatarUrl: string | null;
  };
  profile: {
    skillLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    preferredGame: "SINGLES" | "DOUBLES" | null;
    preferredTime: "MORNING" | "EVENING" | "BOTH";
    playStyle: "CASUAL" | "COMPETITIVE";
    sports: string[];
    availableNow: boolean;
    intro: string | null;
  };
};

export function ProfileClient({ user, profile }: ProfileProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [skillLevel, setSkillLevel] = useState(profile.skillLevel);
  const [preferredGame, setPreferredGame] = useState(profile.preferredGame ?? "DOUBLES");
  const [preferredTime, setPreferredTime] = useState(profile.preferredTime);
  const [playStyle, setPlayStyle] = useState(profile.playStyle);
  const [sportsText, setSportsText] = useState(profile.sports.join(", "));
  const [availableNow, setAvailableNow] = useState(profile.availableNow);
  const [intro, setIntro] = useState(profile.intro ?? "");
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || null,
          bio: bio || null,
          skillLevel,
          preferredGame,
          preferredTime,
          playStyle,
          sports: sportsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          availableNow,
          intro: intro || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatus({ tone: "error", text: data.error || "Could not update profile." });
        return;
      }
      setStatus({ tone: "success", text: "Profile and matchmaking preferences saved." });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onUploadAvatar(file: File | null) {
    if (!file) return;
    const form = new FormData();
    form.append("avatar", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setStatus({ tone: "error", text: data.error || "Avatar upload failed." });
      return;
    }
    setStatus({ tone: "success", text: "Avatar updated." });
    router.refresh();
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwStatus(null);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setPwStatus({ tone: "error", text: data.error || "Password update failed." });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setPwStatus({ tone: "success", text: "Password updated and older sessions signed out." });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h2 className="text-xl font-bold text-[var(--navy-900)]">Member & Player Profile</h2>
        <form onSubmit={onSaveProfile} className="mt-4 space-y-4">
          {status ? <AlertBanner tone={status.tone} title={status.text} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="prof-name" className="text-sm font-semibold">Full Name</label>
              <input id="prof-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="prof-phone" className="text-sm font-semibold">Phone</label>
              <input id="prof-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="prof-skill" className="text-sm font-semibold">Skill Level</label>
              <select id="prof-skill" value={skillLevel} onChange={(e) => setSkillLevel(e.target.value as never)}>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="prof-game" className="text-sm font-semibold">Preferred Game</label>
              <select id="prof-game" value={preferredGame} onChange={(e) => setPreferredGame(e.target.value as never)}>
                <option value="SINGLES">Singles</option>
                <option value="DOUBLES">Doubles</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="prof-time" className="text-sm font-semibold">Preferred Time</label>
              <select id="prof-time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value as never)}>
                <option value="MORNING">Morning</option>
                <option value="EVENING">Evening</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="prof-style" className="text-sm font-semibold">Play Style</label>
              <select id="prof-style" value={playStyle} onChange={(e) => setPlayStyle(e.target.value as never)}>
                <option value="CASUAL">Casual</option>
                <option value="COMPETITIVE">Competitive</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="prof-sports" className="text-sm font-semibold">Sports (comma-separated)</label>
            <input id="prof-sports" value={sportsText} onChange={(e) => setSportsText(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="prof-intro" className="text-sm font-semibold">Matchmaking Intro</label>
            <input
              id="prof-intro"
              maxLength={300}
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="e.g. Looking for regular 7am doubles partners"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="prof-bio" className="text-sm font-semibold">Bio</label>
            <textarea id="prof-bio" rows={3} maxLength={400} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>

          <label className="flex items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={availableNow}
              onChange={(e) => setAvailableNow(e.target.checked)}
              className="h-4 w-4 accent-[var(--stadium-blue)]"
            />
            Show &ldquo;Available Now&rdquo; badge in Find Players
          </label>

          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] rounded-xl bg-[var(--stadium-blue)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--stadium-blue-hover)] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </Card>

      <div className="space-y-6">
        <Card>
          <h2 className="text-lg font-bold text-[var(--navy-900)]">Avatar</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">PNG, JPEG, or WebP up to 2 MB.</p>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="Member avatar" className="mt-3 h-20 w-20 rounded-2xl object-cover" />
          ) : null}
          <label htmlFor="avatar-upload" className="mt-4 block text-xs font-semibold text-slate-700">
            Upload new image
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => onUploadAvatar(e.target.files?.[0] ?? null)}
            className="mt-1.5 w-full text-xs"
          />
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-[var(--navy-900)]">Change Password</h2>
          <form onSubmit={onChangePassword} className="mt-3 space-y-3">
            {pwStatus ? <AlertBanner tone={pwStatus.tone} title={pwStatus.text} /> : null}
            <div className="flex flex-col gap-1">
              <label htmlFor="pw-curr" className="text-xs font-semibold">Current password</label>
              <input
                id="pw-curr"
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="pw-next" className="text-xs font-semibold">New password (min 8 chars)</label>
              <input
                id="pw-next"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="min-h-[42px] w-full rounded-xl bg-[var(--navy-900)] px-4 py-2 text-sm font-semibold text-white"
            >
              Update Password
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
