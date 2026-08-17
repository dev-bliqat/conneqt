import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { readCrmData } from "@/lib/crm-store";

export const CRM_ADMIN_EMAILS = ["josef@bliqat.se", "anton@bliqat.se"] as const;
export const CRM_ROLE_NONE = "Ingen roll";
export const CRM_ROLE_SELLER = "Säljare";
export const CRM_ROLE_OPTIONS = [CRM_ROLE_NONE, CRM_ROLE_SELLER] as const;

export type CrmRoleOption = (typeof CRM_ROLE_OPTIONS)[number];

export type CrmDirectoryUser = {
  userId: string;
  email: string;
  fullName: string;
  ownerName: string;
  role: string;
  isAdmin: boolean;
};

function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

export function isCrmAdminEmail(email?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  return CRM_ADMIN_EMAILS.includes(normalizedEmail as (typeof CRM_ADMIN_EMAILS)[number]);
}

function getClerkDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  emailAddresses?: Array<{ emailAddress?: string | null }>;
}) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  if (user.username?.trim()) {
    return user.username.trim();
  }

  return (
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress ??
    "Okänd användare"
  );
}

export function sanitizeCrmRole(role?: string | null): CrmRoleOption {
  const normalizedRole = (role ?? "").trim().toLowerCase();

  if (normalizedRole.includes("sälj")) {
    return CRM_ROLE_SELLER;
  }

  return CRM_ROLE_OPTIONS.includes(role as CrmRoleOption)
    ? (role as CrmRoleOption)
    : CRM_ROLE_NONE;
}

export async function getCrmUserDirectory(): Promise<CrmDirectoryUser[]> {
  const [client, data] = await Promise.all([clerkClient(), readCrmData()]);
  const response = await client.users.getUserList({ limit: 100 });

  return response.data
    .map((user) => {
      const email =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        "";
      const existingProfile = data.profiles.find((profile) => profile.userId === user.id);
      const fullName = existingProfile?.fullName?.trim() || getClerkDisplayName(user);
      const role = sanitizeCrmRole(existingProfile?.role);
      const isAdmin = isCrmAdminEmail(email);

      return {
        userId: user.id,
        email,
        fullName,
        ownerName: fullName || email,
        role,
        isAdmin,
      };
    })
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "sv"));
}

export async function getSellerOwnerOptions() {
  const directory = await getCrmUserDirectory();

  return directory
    .filter((user) => user.role === CRM_ROLE_SELLER)
    .map((user) => user.ownerName);
}

export async function getCurrentUserAdminState() {
  const { userId } = await auth();

  if (!userId) {
    return {
      userId: null,
      email: "",
      isAdmin: false,
    };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";

  return {
    userId,
    email,
    isAdmin: isCrmAdminEmail(email),
  };
}

export async function requireCrmAdmin() {
  const currentUser = await getCurrentUserAdminState();

  if (!currentUser.userId || !currentUser.isAdmin) {
    throw new Error("Endast josef@bliqat.se och anton@bliqat.se kan administrera roller i CRM-systemet.");
  }

  return currentUser;
}
