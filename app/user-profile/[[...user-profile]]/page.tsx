import { UserProfile } from "@clerk/nextjs";
import { GoogleAccountReauthorize } from "@/components/google-account-reauthorize";
import { GOOGLE_CALENDAR_SCOPE } from "@/lib/google-calendar-shared";
import { GOOGLE_GMAIL_SEND_SCOPE } from "@/lib/google-mail-shared";

export default function UserProfilePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <UserProfile
        path="/user-profile"
        routing="path"
        additionalOAuthScopes={{
          google: [GOOGLE_CALENDAR_SCOPE, GOOGLE_GMAIL_SEND_SCOPE],
        }}
      >
        <UserProfile.Page
          label="Google"
          url="google-access"
          labelIcon={<span aria-hidden="true">G</span>}
        >
          <GoogleAccountReauthorize />
        </UserProfile.Page>
      </UserProfile>
    </div>
  );
}
