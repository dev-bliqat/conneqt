import { clerkClient } from "@clerk/nextjs/server";
import { GOOGLE_GMAIL_SEND_SCOPE } from "@/lib/google-mail-shared";

type GmailSendInput = {
  userId: string;
  recipients: string[];
  subject: string;
  body: string;
  senderName: string;
};

type GmailSendResult =
  | {
      ok: true;
      sentCount: number;
    }
  | {
      ok: false;
      sentCount: number;
      message: string;
    };

function extractGoogleErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object"
  ) {
    const googleError = payload.error as {
      message?: string;
      status?: string;
      errors?: Array<{ message?: string; reason?: string }>;
    };

    const primaryReason = googleError.errors?.[0]?.reason;
    const primaryMessage = googleError.errors?.[0]?.message;

    return [
      googleError.message,
      googleError.status,
      primaryReason,
      primaryMessage,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return "";
}

function hasGmailSendScope(scopes?: string[]) {
  return Boolean(scopes?.includes(GOOGLE_GMAIL_SEND_SCOPE));
}

async function getGoogleMailAccessTokenForUser(userId: string) {
  const client = await clerkClient();
  let tokenResponse:
    | Awaited<ReturnType<typeof client.users.getUserOauthAccessToken>>
    | null = null;

  try {
    tokenResponse = await client.users.getUserOauthAccessToken(userId, "google");
  } catch {
    tokenResponse = null;
  }

  const token = tokenResponse?.data[0];

  if (!token) {
    return {
      ok: false as const,
      message:
        "Ingen användbar Google-anslutning hittades. Logga in med Google eller återanslut Google-kontot via profilmenyn.",
    };
  }

  if (!hasGmailSendScope(token.scopes)) {
    return {
      ok: false as const,
      message:
        "Google-kontot saknar e-postbehörighet. Öppna profilmenyn och återanslut Google för att ge rätt behörighet till Gmail.",
    };
  }

  return {
    ok: true as const,
    token: token.token,
  };
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function buildRawMessage({
  recipient,
  subject,
  body,
  senderName,
  senderEmail,
}: {
  recipient: string;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
}) {
  const fromHeader = senderName
    ? `${encodeHeader(senderName)} <${senderEmail}>`
    : senderEmail;

  return [
    `To: ${recipient}`,
    `From: ${fromHeader}`,
    `Reply-To: ${senderEmail}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    `Subject: ${encodeHeader(subject)}`,
    "",
    body,
  ].join("\r\n");
}

export async function sendGoogleMailToRecipients(
  input: GmailSendInput,
): Promise<GmailSendResult> {
  const access = await getGoogleMailAccessTokenForUser(input.userId);

  if (!access.ok) {
    return {
      ok: false,
      sentCount: 0,
      message: access.message,
    };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(input.userId);
  const senderEmail =
    user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";

  if (!senderEmail) {
    return {
      ok: false,
      sentCount: 0,
      message: "Det gick inte att hitta avsändaradressen för den inloggade användaren.",
    };
  }

  let sentCount = 0;

  for (const recipient of input.recipients) {
    const rawMessage = buildRawMessage({
      recipient,
      subject: input.subject,
      body: input.body,
      senderName: input.senderName,
      senderEmail,
    });

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access.token}`,
        },
        body: JSON.stringify({
          raw: toBase64Url(rawMessage),
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      let responseMessage = "";

      try {
        const payload = (await response.json()) as unknown;
        responseMessage = extractGoogleErrorMessage(payload);
      } catch {
        try {
          responseMessage = await response.text();
        } catch {
          responseMessage = "";
        }
      }

      console.error("Gmail send failed", {
        status: response.status,
        statusText: response.statusText,
        recipient,
        responseMessage,
      });

      return {
        ok: false,
        sentCount,
        message:
          sentCount > 0
            ? `Utskicket avbröts efter ${sentCount} skickade mejl.${responseMessage ? ` Google svarade: ${responseMessage}` : ""}`
            : `Mejlet kunde inte skickas just nu.${responseMessage ? ` Google svarade: ${responseMessage}` : " Kontrollera Gmail-behörigheten och försök igen."}`,
      };
    }

    sentCount += 1;
  }

  return {
    ok: true,
    sentCount,
  };
}
