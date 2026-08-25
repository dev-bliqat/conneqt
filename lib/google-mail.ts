import { clerkClient } from "@clerk/nextjs/server";
import { GOOGLE_GMAIL_SEND_SCOPE } from "@/lib/google-mail-shared";

export type GmailRecipientResult = {
  recipient: string;
  ok: boolean;
  message: string | null;
};

type GmailSendInput = {
  userId: string;
  recipients: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  inlineImageDataUrl?: string | null;
  inlineImageContentId?: string | null;
  senderName: string;
};

type GmailSendResult =
  | {
      ok: true;
      sentCount: number;
      failedCount: number;
      results: GmailRecipientResult[];
    }
  | {
      ok: false;
      sentCount: number;
      failedCount: number;
      message: string;
      results: GmailRecipientResult[];
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

function parseDataUrl(dataUrl: string) {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    base64: match[2].replace(/\s/g, ""),
  };
}

function buildRawMessage({
  recipient,
  subject,
  body,
  htmlBody,
  inlineImageDataUrl,
  inlineImageContentId,
  senderName,
  senderEmail,
}: {
  recipient: string;
  subject: string;
  body: string;
  htmlBody?: string;
  inlineImageDataUrl?: string | null;
  inlineImageContentId?: string | null;
  senderName: string;
  senderEmail: string;
}) {
  const fromHeader = senderName
    ? `${encodeHeader(senderName)} <${senderEmail}>`
    : senderEmail;

  if (htmlBody) {
    const image = inlineImageDataUrl ? parseDataUrl(inlineImageDataUrl) : null;
    const outerBoundary = `mixed_${crypto.randomUUID()}`;
    const alternativeBoundary = `alt_${crypto.randomUUID()}`;
    const relatedBoundary = image ? `related_${crypto.randomUUID()}` : null;

    const headers = [
      `To: ${recipient}`,
      `From: ${fromHeader}`,
      `Reply-To: ${senderEmail}`,
      "MIME-Version: 1.0",
      `Subject: ${encodeHeader(subject)}`,
      `Content-Type: multipart/mixed; boundary="${outerBoundary}"`,
      "",
      `--${outerBoundary}`,
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      "",
      `--${alternativeBoundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      body,
      "",
    ];

    if (image && relatedBoundary && inlineImageContentId) {
      headers.push(
        `--${alternativeBoundary}`,
        `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
        "",
        `--${relatedBoundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: 8bit",
        "",
        htmlBody,
        "",
        `--${relatedBoundary}`,
        `Content-Type: ${image.mimeType}`,
        "Content-Transfer-Encoding: base64",
        `Content-ID: <${inlineImageContentId}>`,
        'Content-Disposition: inline; filename="signature-image"',
        "",
        image.base64,
        "",
        `--${relatedBoundary}--`,
      );
    } else {
      headers.push(
        `--${alternativeBoundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: 8bit",
        "",
        htmlBody,
        "",
      );
    }

    headers.push(`--${alternativeBoundary}--`, "", `--${outerBoundary}--`);
    return headers.join("\r\n");
  }

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
    const results = input.recipients.map((recipient) => ({
      recipient,
      ok: false,
      message: access.message,
    }));

    return {
      ok: false,
      sentCount: 0,
      failedCount: results.length,
      message: access.message,
      results,
    };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(input.userId);
  const senderEmail =
    user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";

  if (!senderEmail) {
    const results = input.recipients.map((recipient) => ({
      recipient,
      ok: false,
      message: "Det gick inte att hitta avsändaradressen för den inloggade användaren.",
    }));

    return {
      ok: false,
      sentCount: 0,
      failedCount: results.length,
      message: "Det gick inte att hitta avsändaradressen för den inloggade användaren.",
      results,
    };
  }

  let sentCount = 0;
  const results: GmailRecipientResult[] = [];

  for (const recipient of input.recipients) {
    const rawMessage = buildRawMessage({
      recipient,
      subject: input.subject,
      body: input.body,
      htmlBody: input.htmlBody,
      inlineImageDataUrl: input.inlineImageDataUrl,
      inlineImageContentId: input.inlineImageContentId,
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

      results.push({
        recipient,
        ok: false,
        message:
          responseMessage ||
          "Mejlet kunde inte skickas just nu. Kontrollera Gmail-behörigheten och försök igen.",
      });

      continue;
    }

    sentCount += 1;
    results.push({
      recipient,
      ok: true,
      message: null,
    });
  }

  const failedCount = results.length - sentCount;

  if (failedCount > 0) {
    return {
      ok: false,
      sentCount,
      failedCount,
      results,
      message:
        sentCount > 0
          ? `${failedCount} av ${results.length} mejl misslyckades.`
          : `Inga mejl kunde skickas av ${results.length} försök.`,
    };
  }

  return {
    ok: true,
    sentCount,
    failedCount: 0,
    results,
  };
}
