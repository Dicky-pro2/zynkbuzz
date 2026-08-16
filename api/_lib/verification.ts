import crypto from "node:crypto";
import { Cocobase } from "cocobase";

export const verificationRateLimits = new Map<
  string,
  { count: number; startedAt: number }
>();

export function getCocobaseConfig() {
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

export function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getVerificationExpiresAt() {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}

export function allowVerificationRequest(key: string, maxPerHour = 3) {
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

export async function upsertUserEmailIndex(
  client: Cocobase,
  userId: string,
  email: string,
) {
  const normalizedEmail = normalizeEmail(email);
  if (!userId || !normalizedEmail) return;

  const collections = ["user_email_index", "email_lookup", "users"];
  for (const collectionName of collections) {
    try {
      const existing = await client
        .listDocuments<Record<string, unknown>>(collectionName, {
          filters: { email: normalizedEmail },
          limit: 1,
          sort: "created_at",
          order: "desc",
        })
        .catch(() => []);

      if (Array.isArray(existing) && existing.length > 0) {
        const match = existing.find((doc) => {
          const data = (doc as { data?: Record<string, unknown> }).data ?? {};
          return String(data.email ?? "") === normalizedEmail;
        });

        if (match) {
          const matchData =
            (match as { data?: Record<string, unknown> }).data ?? {};
          if (String(matchData.userId ?? "") === userId) {
            return;
          }
        }
      }

      await client.createDocument(collectionName, {
        userId,
        email: normalizedEmail,
        normalizedEmail,
        createdAt: new Date().toISOString(),
      });
      return;
    } catch {
      // The collection may not exist yet; continue to the next collection target.
    }
  }
}

export async function findUserByEmail(
  client: Cocobase,
  email: string,
): Promise<{ id: string; email: string; name?: string } | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const lookupCollections = ["user_email_index", "email_lookup", "users"];
  for (const collectionName of lookupCollections) {
    try {
      const documents = await client
        .listDocuments<Record<string, unknown>>(collectionName, {
          filters: { email: normalizedEmail },
          limit: 10,
          sort: "created_at",
          order: "desc",
        })
        .catch(() => []);

      const match = Array.isArray(documents)
        ? documents.find((doc) => {
            const data = (doc as { data?: Record<string, unknown> }).data ?? {};
            return String(data.email ?? "") === normalizedEmail;
          })
        : null;

      if (match) {
        const data = (match as { data?: Record<string, unknown> }).data ?? {};
        const userId = String(
          data.userId ?? (match as { id?: string }).id ?? "",
        );
        if (userId) {
          const userName =
            typeof data.name === "string"
              ? data.name
              : typeof data.fullName === "string"
                ? data.fullName
                : undefined;

          return {
            id: userId,
            email: normalizedEmail,
            name: userName,
          };
        }
      }
    } catch {
      // Ignore collection-level lookup errors and continue to the next candidate.
    }
  }

  return null;
}

export async function findUserById(
  client: Cocobase,
  userId: string,
): Promise<{ id: string; email?: string; name?: string } | null> {
  try {
    const user = await client.auth.getUserById(userId);
    const email =
      typeof user.email === "string" ? user.email.toLowerCase() : "";
    return {
      id: user.id,
      email,
      name: user.email || "user",
    };
  } catch {
    return null;
  }
}
