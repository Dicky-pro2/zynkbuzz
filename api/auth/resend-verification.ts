import crypto from "node:crypto";
import { Cocobase } from "cocobase";
import { sendVerificationEmail } from "../_lib/email";

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

function sanitizeEmail(input: unknown) {
  if (typeof input !== "string") return "";
  return input.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const resendRateLimit = new Map<string, { count: number; startedAt: number }>();

function allowRequest(key: string, maxPerHour = 3) {
  const now = Date.now();
  const existing = resendRateLimit.get(key);

  if (!existing) {
    resendRateLimit.set(key, { count: 1, startedAt: now });
    return true;
  }

  const windowMs = 60 * 60 * 1000;
  if (now - existing.startedAt > windowMs) {
    resendRateLimit.set(key, { count: 1, startedAt: now });
    return true;
  }

  if (existing.count >= maxPerHour) {
    return false;
  }

  existing.count += 1;
  resendRateLimit.set(key, existing);
  return true;
}

async function findUserByEmail(client: Cocobase, email: string) {
  try {
    const response = await client.auth.listUsers({ limit: 200 });
    const users = Array.isArray(response?.data) ? response.data : [];
    return (
      users.find((user) => {
        const appUserEmail = String((user as { email?: string }).email ?? "")
          .trim()
          .toLowerCase();
        return appUserEmail === email;
      }) ?? null
    );
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

  const email = sanitizeEmail(
    (req.body as { email?: unknown } | undefined)?.email ?? "",
  );

  if (!email || !isValidEmail(email)) {
    res.status(200).json({
      success: true,
      message:
        "If an account with that email requires verification, a new verification email has been sent.",
    });
    return;
  }

  const clientConfig = getCocobaseConfig();
  if (!clientConfig.apiKey || !clientConfig.projectId) {
    res.status(200).json({
      success: true,
      message:
        "If an account with that email requires verification, a new verification email has been sent.",
    });
    return;
  }

  const ipKey = String(
    req.headers?.["x-forwarded-for"] ||
      req.headers?.["X-Forwarded-For"] ||
      "unknown",
  );
  if (!allowRequest(`${ipKey}:${email}`, 3)) {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please wait a moment before trying again.",
    });
    return;
  }

  try {
    const client = new Cocobase({
      apiKey: clientConfig.apiKey,
      projectId: clientConfig.projectId,
      baseURL: clientConfig.baseURL,
      timeout: 60000,
    });

    const user = await findUserByEmail(client, email);
    if (!user) {
      res.status(200).json({
        success: true,
        message:
          "If an account with that email requires verification, a new verification email has been sent.",
      });
      return;
    }

    const data = (user as { data?: Record<string, unknown> }).data ?? {};
    const userId = String((user as { id?: string }).id ?? "");
    const isVerified = Boolean(
      data.isEmailVerified === true ||
      data.is_email_verified === true ||
      data.emailVerified === true ||
      data.email_verified === true,
    );

    if (isVerified) {
      res.status(200).json({
        success: true,
        message:
          "If an account with that email requires verification, a new verification email has been sent.",
      });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

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
        message: "Too many requests. Please wait a moment before trying again.",
      });
      return;
    }

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
      name: String(
        (user as { name?: string }).name || email.split("@")[0] || "there",
      ),
      token,
    });

    res.status(200).json({
      success: true,
      message:
        "If an account with that email requires verification, a new verification email has been sent.",
    });
  } catch {
    res.status(200).json({
      success: true,
      message:
        "If an account with that email requires verification, a new verification email has been sent.",
    });
  }
}
