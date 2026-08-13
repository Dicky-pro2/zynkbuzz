import crypto from "node:crypto";
import { Cocobase } from "cocobase";
import { sendVerificationEmail } from "./_lib/email";

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

async function getCurrentUserFromToken(accessToken: string) {
  if (!accessToken) return null;
  const { apiKey, projectId, baseURL } = getCocobaseConfig();
  if (!apiKey || !projectId) return null;

  const client = new Cocobase({
    apiKey,
    projectId,
    baseURL,
    timeout: 60000,
  });

  client.auth.setToken(accessToken);
  try {
    return await client.auth.getCurrentUser();
  } catch {
    return null;
  }
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
    userId?: string;
    email?: string;
    name?: string;
    accessToken?: string;
  };

  const userId = body.userId?.trim();
  const email = body.email?.trim().toLowerCase();
  const accessToken = body.accessToken || getBearerToken(req.headers);

  if (!userId || !email) {
    res.status(400).json({ error: "Missing user identity or email." });
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

    if (accessToken) {
      const currentUser = await getCurrentUserFromToken(accessToken);
      if (!currentUser || currentUser.id !== userId) {
        throw new Error(
          "The authenticated session does not match the requested user.",
        );
      }
    }

    const user = await getUserByIdOrEmail(client, userId, email);
    if (!user) {
      throw new Error("User not found.");
    }

    const normalizedEmail = String(user.email || "")
      .trim()
      .toLowerCase();
    if (normalizedEmail !== email) {
      throw new Error("Email does not match the authenticated account.");
    }

    const verificationDocs = await client
      .listDocuments<Record<string, unknown>>("email_verifications", {
        sort: "created_at",
        order: "desc",
      })
      .catch(() => []);

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentCount = verificationDocs.filter((doc) => {
      const data = (doc as { data?: Record<string, unknown> }).data ?? {};
      const createdAt = String(
        data.createdAt ?? (doc as { created_at?: string }).created_at ?? "",
      );
      return (
        String(data.userId ?? "") === userId &&
        createdAt &&
        new Date(createdAt).getTime() >= oneHourAgo
      );
    }).length;

    if (recentCount >= 3) {
      res.status(429).json({
        success: false,
        error:
          "Too many verification emails sent. Please wait before requesting another one.",
      });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await client.createDocument("email_verifications", {
      userId,
      email,
      tokenHash,
      expiresAt,
      createdAt: new Date().toISOString(),
      usedAt: null,
    });

    await sendVerificationEmail({
      to: email,
      name: body.name || getUserDisplayName(user),
      token,
    });

    res.status(200).json({
      success: true,
      message: "Verification email sent.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to send verification email.";
    res.status(400).json({ success: false, error: message });
  }
}
