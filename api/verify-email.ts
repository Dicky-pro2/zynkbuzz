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

function getBearerToken(
  headers?: Record<string, string | string[] | undefined>,
) {
  const auth = headers?.authorization || headers?.Authorization;
  if (typeof auth === "string") {
    const match = auth.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : "";
  }
  return "";
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

async function getUserByIdOrEmail(
  client: Cocobase,
  userId?: string,
  email?: string,
) {
  if (!userId && !email) return null;

  try {
    const response = await client.auth.listUsers({ limit: 200 });
    const users = Array.isArray(response?.data) ? response.data : [];

    const match = users.find((user) => {
      const userEmail = String(user.email || "").toLowerCase();
      const sameId = user.id && userId && user.id === userId;
      const sameEmail = email ? userEmail === email.toLowerCase() : false;
      return sameId || sameEmail;
    });

    return match ?? null;
  } catch {
    return null;
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
    accessToken?: string;
  };

  const rawToken = body.token?.trim();
  const accessToken = body.accessToken || getBearerToken(req.headers);

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
      throw new Error(
        "Verification token is invalid or has already been used.",
      );
    }

    const data = (record as { data?: Record<string, unknown> }).data ?? {};
    const userId = String(data.userId ?? "");
    const email = String(data.email ?? "").toLowerCase();
    const expiresAt = String(data.expiresAt ?? "");
    const usedAt = data.usedAt ? String(data.usedAt) : "";

    if (usedAt) {
      throw new Error("This verification link has already been used.");
    }

    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      throw new Error(
        "This verification link has expired. Please request a new one.",
      );
    }

    const user = await getUserByIdOrEmail(client, userId, email);
    if (!user) {
      throw new Error("This account could not be found.");
    }

    if (accessToken) {
      client.auth.setToken(accessToken);
      const currentUser = await client.auth.getCurrentUser().catch(() => null);
      if (!currentUser || currentUser.id !== user.id) {
        throw new Error(
          "The authenticated session does not match the account being verified.",
        );
      }

      const currentData =
        (currentUser as { data?: Record<string, unknown> }).data ?? {};
      const alreadyVerified = Boolean(
        currentData.isEmailVerified === true ||
        currentData.isEmailVerified === "true",
      );
      if (!alreadyVerified) {
        await client.auth.updateUser({
          data: {
            isEmailVerified: true,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      const welcomeFlag = Boolean(
        currentData.welcomeEmailSent === true ||
        currentData.welcomeEmailSent === "true",
      );

      if (!welcomeFlag) {
        await sendWelcomeEmail({
          to: String(currentUser.email || email),
          name: getUserDisplayName(currentUser),
        });
        await client.auth.updateUser({
          data: {
            welcomeEmailSent: true,
            updatedAt: new Date().toISOString(),
          },
        });
      }
    }

    await client
      .updateDocument("email_verifications", String(record.id), {
        usedAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
      })
      .catch(() => undefined);

    res.status(200).json({
      success: true,
      message: "Email verified successfully.",
      userId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to verify your email address.";
    res.status(400).json({ success: false, error: message });
  }
}
