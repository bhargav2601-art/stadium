export const ROLES = ["MEMBER", "STAFF", "ADMINISTRATOR", "SUPER_ADMINISTRATOR"] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  "games.play",
  "courts.update",
  "checkin.verify",
  "issues.report",
  "attendance.view",
  "members.manage",
  "payments.verify",
  "facilities.manage",
  "yoga.manage",
  "basketball.schedule",
  "announcements.send",
  "games.moderate",
  "reports.view",
  "staff.manage",
  "pricing.update",
  "settings.critical",
  "admins.manage",
  "audit.read",
] as const;

export type Action = (typeof ACTIONS)[number];

const GRANTS: Record<Role, Action[]> = {
  MEMBER: ["games.play"],
  STAFF: ["games.play", "courts.update", "checkin.verify", "issues.report", "attendance.view"],
  ADMINISTRATOR: [
    "games.play",
    "courts.update",
    "checkin.verify",
    "issues.report",
    "attendance.view",
    "members.manage",
    "payments.verify",
    "facilities.manage",
    "yoga.manage",
    "basketball.schedule",
    "announcements.send",
    "games.moderate",
    "reports.view",
    "staff.manage",
  ],
  SUPER_ADMINISTRATOR: [
    "games.play",
    "courts.update",
    "checkin.verify",
    "issues.report",
    "attendance.view",
    "members.manage",
    "payments.verify",
    "facilities.manage",
    "yoga.manage",
    "basketball.schedule",
    "announcements.send",
    "games.moderate",
    "reports.view",
    "staff.manage",
    "pricing.update",
    "settings.critical",
    "admins.manage",
    "audit.read",
  ],
};

export function can(role: Role, action: Action) {
  return GRANTS[role].includes(action);
}

export function assertCan(role: Role, action: Action) {
  if (!can(role, action)) {
    throw new Error("You do not have permission to do that.");
  }
}

const ROLE_RANK: Record<Role, number> = {
  MEMBER: 1,
  STAFF: 2,
  ADMINISTRATOR: 3,
  SUPER_ADMINISTRATOR: 4,
};

/** An actor may assign only roles strictly below their own, and never their own account. */
export function canAssignRole(actor: Role, targetCurrent: Role, next: Role, sameUser: boolean) {
  if (sameUser) return false;
  if (!can(actor, actor === "SUPER_ADMINISTRATOR" ? "admins.manage" : "staff.manage")) return false;
  if (actor === "ADMINISTRATOR" && (next === "ADMINISTRATOR" || next === "SUPER_ADMINISTRATOR")) return false;
  if (actor === "ADMINISTRATOR" && ROLE_RANK[targetCurrent] >= ROLE_RANK.ADMINISTRATOR) return false;
  return ROLE_RANK[actor] > ROLE_RANK[targetCurrent] || actor === "SUPER_ADMINISTRATOR";
}
