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

function isEmailVerified(
  user: { data?: Record<string, unknown> } | null | undefined,
) {
  const data = user?.data ?? {};
  return Boolean(
    data.isEmailVerified === true ||
    data.is_email_verified === true ||
    data.emailVerified === true ||
    data.email_verified === true,
  );
}

const verificationRateLimits = new Map<
  string,
  { count: number; startedAt: number }
>();

function allowVerificationRequest(key: string, maxPerHour = 3) {
  const now = Date.now();
  const existing = verificationRateLimits.get(key);

  if (!existing) {
    verificationRateLimits.set(key, { count: 1, startedAt: now });
    return true;
  }

  const windowMs = 60 * 60 * 1000;
  if (now - existing.startedAt > windowMs) {
    verificationRateLimits.set(key, { count: 1, startedAt: now });
    return true;
  }

  if (existing.count >= maxPerHour) {
    return false;
  }

  existing.count += 1;
  verificationRateLimits.set(key, existing);
  return true;
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

  // Extract authentication token from Authorization header
  const accessToken = getBearerToken(req.headers);

  // Verify that the request is authenticated
  if (!accessToken) {
    res.status(401).json({ error: "Unauthorized. Authentication required." });
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

    // Get the authenticated user's identity from the token
    // Do NOT trust browser-supplied userId or email
    const currentUser = await getCurrentUserFromToken(accessToken);
    if (!currentUser) {
      res
        .status(401)
        .json({ error: "Invalid or expired authentication token." });
      return;
    }

    const userId = currentUser.id;
    const email = String(currentUser.email || "").toLowerCase();
    const name = getUserDisplayName(currentUser);

    if (isEmailVerified(currentUser)) {
      res.status(200).json({
        success: true,
        message: "This email is already verified.",
      });
      return;
    }

    const rateLimitKey = `${userId}:${email}`;
    if (!allowVerificationRequest(rateLimitKey)) {
      res.status(429).json({
        error:
          "Too many verification emails sent. Please wait before requesting another one.",
      });
      return;
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
        error:
          "Too many verification emails sent. Please wait before requesting another one.",
      });
      return;
    }

    // Generate cryptographically random token (32 bytes = 256 bits)
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Store the token hash and metadata server-side
    await client.createDocument("email_verifications", {
      userId,
      email,
      tokenHash,
      expiresAt,
      createdAt: new Date().toISOString(),
      usedAt: null,
    });

    // Send verification email with the raw token
    await sendVerificationEmail({
      to: email,
      name,
      token,
    });

    // Return success without exposing internal details
    res.status(200).json({
      success: true,
      message: "Verification email sent.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to send verification email.";
    res.status(400).json({ error: message });
  }
}
