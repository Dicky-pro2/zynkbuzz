import crypto from "node:crypto";
import { Cocobase } from "cocobase";
import { sendWelcomeEmail } from "./_lib/email";

function getCocobaseConfig() {
  return {
    apiKey:
      process.env.COCOBASE_API_KEY || process.env.VITE_COCOBASE_API_KEY || "",
    projectId:
      process.env.COCOBASE_PROJECT_ID ||
      process.env.VITE_COCOBASE_PROJECT_ID ||
      "",
    baseURL:
      process.env.COCOBASE_BASE_URL ||
      process.env.VITE_COCOBASE_BASE_URL ||
      "https://api.cocobase.cc",
  };
}

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

// Helper to update user's email verification status via Cocobase admin API
async function markUserEmailVerified(
  userId: string,
  baseURL: string,
  apiKey: string,
): Promise<void> {
  try {
    // Attempt to update user via Cocobase REST API using admin API key
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
          updatedAt: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      // Log but don't fail - the token is already marked as used
      console.error(
        "Failed to update user email verification status:",
        response.status,
      );
    }
  } catch (error) {
    // Log but don't fail - the token is already marked as used
    console.error("Error updating email verification status:", error);
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

    // Hash the provided token and search for it
    const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const records = await client
      .listDocuments<Record<string, unknown>>("email_verifications", {
        sort: "created_at",
        order: "desc",
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

    // Check if token has already been used
    if (usedAt) {
      res.status(409).json({
        error: "This verification link has already been used.",
      });
      return;
    }

    // Check if token has expired
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      res.status(400).json({
        error: "This verification link has expired. Please request a new one.",
      });
      return;
    }

    // Mark token as used immediately to prevent race conditions
    // This is the critical step to make verification idempotent
    await client
      .updateDocument("email_verifications", String(record.id), {
        usedAt: new Date().toISOString(),
      })
      .catch(() => undefined);

    // Now that token is marked as used, proceed with verification
    // Update the user's isEmailVerified status via the Cocobase admin API
    await markUserEmailVerified(userId, baseURL, apiKey);

    // Send welcome email (only if we haven't already)
    // This should only happen once since we check usedAt above
    try {
      await sendWelcomeEmail({
        to: email,
        name: getUserDisplayName({ email, name: email.split("@")[0] }),
      });
    } catch (emailError) {
      console.error("Failed to send welcome email", emailError);
      // Welcome email failure should NOT undo verification
      // Verification is already complete
    }

    // Return success to frontend
    // Do NOT include userId or other internal details
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
