import { Cocobase } from "cocobase";
import { sendVerificationEmail } from "./_lib/email";
import {
  allowVerificationRequest,
  generateVerificationToken,
  getCocobaseConfig,
  getVerificationExpiresAt,
  hashVerificationToken,
} from "./_lib/verification";

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

  const accessToken = getBearerToken(req.headers);

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
        filters: { userId },
        sort: "created_at",
        order: "desc",
        limit: 50,
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

    const token = generateVerificationToken();
    const tokenHash = hashVerificationToken(token);
    const expiresAt = getVerificationExpiresAt();

    await client.createDocument("email_verifications", {
      userId,
      email,
      tokenHash,
      expiresAt,
      createdAt: new Date().toISOString(),
      usedAt: null,
      welcomeEmailSentAt: null,
    });

    await sendVerificationEmail({
      to: email,
      name,
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
    res.status(400).json({ error: message });
  }
}
