import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SsoCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback
      signInFallbackRedirectUrl="/user-profile/google-access"
      signUpFallbackRedirectUrl="/user-profile/google-access"
      signInForceRedirectUrl="/user-profile/google-access"
      signUpForceRedirectUrl="/user-profile/google-access"
    />
  );
}
