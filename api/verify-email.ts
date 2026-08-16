import { Cocobase } from "cocobase";
import { sendWelcomeEmail } from "./_lib/email";
import { getCocobaseConfig, hashVerificationToken } from "./_lib/verification";

function getJsonBody(req: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}) {
  if (req.method === "GET") {
    return {};
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body ?? {};
}

function getUserDisplayName(user: {
  data?: Record<string, unknown>;
  email?: string;
  name?: string;
}) {
  const data = user.data ?? {};
  const nameFromData =
    typeof data.name === "string"
      ? data.name
      : [data.firstName, data.lastName]
          .filter((value) => typeof value === "string" && value.trim())
          .join(" ") || "";

  return (nameFromData || user.name || user.email || "there").trim() || "there";
}

async function markUserEmailVerified(
  userId: string,
  baseURL: string,
  apiKey: string,
): Promise<void> {
  const url = `${baseURL}/auth/users/${encodeURIComponent(userId)}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      data: {
        isEmailVerified: true,
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to update user email verification status.");
  }
}

export default async function handler(
  req: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string | string[] | undefined>;
  },
  res: {
    status: (code: number) => { json: (payload: unknown) => void };
  },
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = getJsonBody(req) as {
    token?: string;
  };

  const rawToken = body.token?.trim();

  if (!rawToken) {
    res.status(400).json({ error: "Missing verification token." });
    return;
  }

  try {
    const { apiKey, projectId, baseURL } = getCocobaseConfig();
    if (!apiKey || !projectId) {
      throw new Error("Cocobase credentials are not configured on the server.");
    }

    const client = new Cocobase({
      apiKey,
      projectId,
      baseURL,
      timeout: 60000,
    });

    const hash = hashVerificationToken(rawToken);
    const records = await client
      .listDocuments<Record<string, unknown>>("email_verifications", {
        filters: { tokenHash: hash },
        sort: "created_at",
        order: "desc",
        limit: 20,
      })
      .catch(() => []);

    const record = records.find((doc) => {
      const data = (doc as { data?: Record<string, unknown> }).data ?? {};
      return String(data.tokenHash ?? "") === hash;
    });

    if (!record) {
      res.status(404).json({
        error: "Verification token is invalid or has already been used.",
      });
      return;
    }

    const data = (record as { data?: Record<string, unknown> }).data ?? {};
    const userId = String(data.userId ?? "");
    const email = String(data.email ?? "").toLowerCase();
    const expiresAt = String(data.expiresAt ?? "");
    const usedAt = data.usedAt ? String(data.usedAt) : "";
    const welcomeEmailSentAt = data.welcomeEmailSentAt
      ? String(data.welcomeEmailSentAt)
      : "";

    if (usedAt) {
      res.status(409).json({
        error: "This verification link has already been used.",
      });
      return;
    }

    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      res.status(400).json({
        error: "This verification link has expired. Please request a new one.",
      });
      return;
    }

    const now = new Date().toISOString();
    try {
      await client.updateDocument("email_verifications", String(record.id), {
        usedAt: now,
        consumedAt: now,
        updatedAt: now,
      });
    } catch {
      throw new Error(
        "Unable to finalize verification token. Please request a new verification email.",
      );
    }

    try {
      await markUserEmailVerified(userId, baseURL, apiKey);
    } catch {
      throw new Error(
        "Verification could not be completed. Please request a new verification email.",
      );
    }

    if (!welcomeEmailSentAt) {
      try {
        await sendWelcomeEmail({
          to: email,
          name: getUserDisplayName({ email, name: email.split("@")[0] }),
        });
        await client.updateDocument("email_verifications", String(record.id), {
          welcomeEmailSentAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (emailError) {
        console.error("Failed to send welcome email", emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to verify your email address.";
    res.status(500).json({ error: message });
  }
}
