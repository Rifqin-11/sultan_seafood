import "server-only";

import { createClient } from "@/lib/supabase/server";
import { ROLE_PERMISSIONS, type Permission, type ProfileStatus, type Role } from "@/types";

export interface ApprovedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: "APPROVED";
}

export class AuthorizationError extends Error {
  constructor(message: string, public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" = "FORBIDDEN") {
    super(message);
    this.name = "AuthorizationError";
  }
}

function isRole(value: unknown): value is Role {
  return value === "OWNER" || value === "FINANCE" || value === "STAFF";
}

export async function getApprovedUser(): Promise<ApprovedUser | null> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, status")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status !== "APPROVED" || !isRole(profile.role)) {
    return null;
  }

  return {
    id: authData.user.id,
    email: authData.user.email ?? "",
    name: profile.full_name,
    role: profile.role,
    status: "APPROVED",
  };
}

export async function requireApprovedUser(): Promise<ApprovedUser> {
  const user = await getApprovedUser();
  if (!user) {
    throw new AuthorizationError("Sesi tidak valid atau akun belum disetujui.", "UNAUTHENTICATED");
  }
  return user;
}

export async function requireRole(allowedRoles: readonly Role[]): Promise<ApprovedUser> {
  const user = await requireApprovedUser();
  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError("Anda tidak memiliki hak akses untuk tindakan ini.");
  }
  return user;
}

export async function requirePermission(permission: Permission): Promise<ApprovedUser> {
  const user = await requireApprovedUser();
  if (!ROLE_PERMISSIONS[user.role].includes(permission)) {
    throw new AuthorizationError("Anda tidak memiliki hak akses untuk tindakan ini.");
  }
  return user;
}

export function hasPermission(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function normalizeActionError(error: unknown, fallback: string) {
  if (error instanceof AuthorizationError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isApprovedStatus(status: ProfileStatus): status is "APPROVED" {
  return status === "APPROVED";
}
