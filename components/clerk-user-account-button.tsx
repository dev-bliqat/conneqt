"use client";

import { UserButton } from "@clerk/nextjs";
import { GOOGLE_CALENDAR_SCOPE } from "@/lib/google-calendar-shared";
import { GOOGLE_GMAIL_SEND_SCOPE } from "@/lib/google-mail-shared";

export function ClerkUserAccountButton() {
  return (
    <UserButton
      userProfileMode="navigation"
      userProfileUrl="/user-profile"
      userProfileProps={{
        additionalOAuthScopes: {
          google: [GOOGLE_CALENDAR_SCOPE, GOOGLE_GMAIL_SEND_SCOPE],
        },
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Link
          label="Återanslut Google"
          href="/user-profile/google-access"
          labelIcon={<span aria-hidden="true">G</span>}
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
