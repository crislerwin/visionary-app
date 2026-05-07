import type { MemberRole } from "@prisma/client";

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function hasRole(role: MemberRole | undefined, minimumRole: MemberRole): boolean {
  if (!role) return false;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole];
}

export function canManageProducts(role: MemberRole | undefined): boolean {
  return hasRole(role, "ADMIN");
}

export function canManageCategories(role: MemberRole | undefined): boolean {
  return hasRole(role, "ADMIN");
}

export function canManageOrders(role: MemberRole | undefined): boolean {
  return hasRole(role, "MEMBER");
}

export function canManageSettings(role: MemberRole | undefined): boolean {
  return hasRole(role, "ADMIN");
}

export function canManageCashRegister(role: MemberRole | undefined): boolean {
  return hasRole(role, "ADMIN");
}

export function canInviteMembers(role: MemberRole | undefined): boolean {
  return hasRole(role, "ADMIN");
}
