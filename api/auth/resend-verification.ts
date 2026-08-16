import { Cocobase } from "cocobase";
import { sendVerificationEmail } from "../_lib/email";
import {
  allowVerificationRequest,
  findUserByEmail,
  generateVerificationToken,
  getCocobaseConfig,
  getVerificationExpiresAt,
  hashVerificationToken,
  isValidEmail,
  normalizeEmail,
} from "../_lib/verification";

// NOTE: This in-memory limiter is intentionally temporary. Vercel serverless
// instances are not guaranteed to share a single process, so it is not a
// globally consistent distributed rate limit. This exists as an early guard,
// while a deployment-level persistent limiter can be added later if the
// underlying platform or datastore supports it safely.
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

  const email = normalizeEmail(
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

    try {
      const currentUser = await client.auth.getUserById(user.id);
      const data =
        (currentUser as { data?: Record<string, unknown> }).data ?? {};
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
    } catch {
      // Fall through and keep the generic response behavior for lookup failures.
    }

    const userRateLimitKey = `public:${user.id}:${email}`;
    if (!allowVerificationRequest(userRateLimitKey, 3)) {
      res.status(429).json({
        success: false,
        message: "Too many requests. Please wait a moment before trying again.",
      });
      return;
    }

    const verificationDocs = await client
      .listDocuments<Record<string, unknown>>("email_verifications", {
        filters: { userId: user.id },
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
        String(data.userId ?? "") === user.id &&
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

    const token = generateVerificationToken();
    const tokenHash = hashVerificationToken(token);
    const expiresAt = getVerificationExpiresAt();

    await client.createDocument("email_verifications", {
      userId: user.id,
      email,
      tokenHash,
      expiresAt,
      createdAt: new Date().toISOString(),
      usedAt: null,
      welcomeEmailSentAt: null,
    });

    await sendVerificationEmail({
      to: email,
      name: user.name || email.split("@")[0] || "there",
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
