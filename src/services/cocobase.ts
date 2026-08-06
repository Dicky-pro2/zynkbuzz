import { Cocobase, type AppUser, type Document } from "cocobase";
import env from "../config/env";
import type {
  Notification,
  Role,
  Task,
  Transaction,
  User,
  Withdrawal,
} from "../types";

const hasCocobaseConfig = Boolean(
  env.COCOBASE_API_KEY && env.COCOBASE_PROJECT_ID,
);

export const cocobaseClient = hasCocobaseConfig
  ? new Cocobase({
      apiKey: env.COCOBASE_API_KEY,
      projectId: env.COCOBASE_PROJECT_ID,
      baseURL: env.COCOBASE_BASE_URL || undefined,
      timeout: 60000,
    })
  : null;

export const isCocobaseEnabled = Boolean(cocobaseClient);

function normalizeRole(value: unknown, fallback: Role = "earner"): Role {
  if (value === "advertiser" || value === "earner" || value === "admin") {
    return value;
  }
  return fallback;
}

function pickFirstDefined<T>(
  ...values: Array<T | undefined | null>
): T | undefined {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }
  return fallback;
}

export function normalizeUser(
  appUser?: AppUser | null,
  fallbackRole: Role = "earner",
): User | null {
  if (!appUser) return null;

  const data = asRecord(appUser.data);
  const role = normalizeRole(
    pickFirstDefined(
      asString(data.role),
      asString(data.userRole),
      appUser.roles?.[0],
    ),
    fallbackRole,
  );

  const firstName = asString(data.firstName) ?? "";
  const lastName = asString(data.lastName) ?? "";
  const derivedName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    asString(data.name) ||
    appUser.email?.split("@")[0] ||
    "User";

  return {
    id: appUser.id,
    name: derivedName,
    firstName,
    lastName,
    nickname:
      pickFirstDefined(
        asString(data.nickname),
        asString(data.nickName),
        asString(data.username),
      ) ?? null,
    email: appUser.email,
    phoneNumber: asString(data.phoneNumber) ?? "",
    dateOfBirth: asString(data.dateOfBirth) ?? "",
    gender: asString(data.gender) ?? "",
    role,
    avatar: asString(data.avatar) ?? null,
    walletBalance: asNumber(data.walletBalance),
    totalEarned: asNumber(data.totalEarned),
    totalSpent: asNumber(data.totalSpent),
    tasksCompleted: asNumber(data.tasksCompleted),
    tasksPosted: asNumber(data.tasksPosted),
    isEmailVerified: asBoolean(data.isEmailVerified, false),
    taskQualityScore: asNumber(data.taskQualityScore) || 100,
    currentStreak: asNumber(data.currentStreak) || 0,
    longestStreak: asNumber(data.longestStreak) || 0,
    referralsCount: asNumber(data.referralsCount) || 0,
    referralEarnings: asNumber(data.referralEarnings) || 0,
    referralLevel: asNumber(data.referralLevel) || 1,
    theme: (asString(data.theme) ?? "light") as "light" | "dark",
  };
}

// Purpose: convert raw Cocobase documents into the app's task shape so the earner UI can render them consistently.
function normalizeTask(document: Document<Record<string, unknown>>): Task {
  const data = asRecord(document.data);
  const totalSlots = asNumber(data.totalSlots);
  const completionCount = asNumber(data.completionCount);
  const slotsLeft = Math.max(0, totalSlots - completionCount);
  const advertiserId =
    asString(data.advertiserId) ?? asString(data.advertiser) ?? "";
  const advertiserName =
    asString(data.advertiserName) ??
    asString(data.advertiserDisplayName) ??
    "Advertiser";

  return {
    id: document.id,
    advertiser: advertiserId,
    advertiserName,
    advertiserId,
    advertiserEmail: asString(data.advertiserEmail) ?? "",
    advertiserDisplayName:
      asString(data.advertiserDisplayName) ?? advertiserName,
    platform: asString(data.platform) ?? "",
    taskType: asString(data.taskType) ?? "",
    title: asString(data.title) ?? "Untitled task",
    instructions: asString(data.instructions) ?? "",
    url: asString(data.url) ?? "",
    reward: asNumber(data.reward),
    totalSlots,
    slotsLeft,
    completionCount,
    status: (asString(data.status) as Task["status"] | undefined) ?? "active",
    createdAt: asString(data.createdAt) ?? asString(document.created_at) ?? "",
    minQualityScore: asNumber(data.minQualityScore) || undefined,
  };
}

function normalizeAuthError(error: unknown): Error {
  if (error instanceof Error) {
    const message = error.message?.toLowerCase() ?? "";
    if (message.includes("timeout") || message.includes("timed out")) {
      return new Error(
        "The sign-in service is taking too long. Please try again in a moment.",
      );
    }
    if (
      message.includes("unauthorized") ||
      message.includes("invalid") ||
      message.includes("credential")
    ) {
      return new Error("Incorrect email or password.");
    }
    return new Error(error.message);
  }
  return new Error("Unable to sign in right now.");
}

async function requestCocobase(
  path: string,
  options: { method: string; body?: unknown; useDataKey?: boolean },
) {
  if (!cocobaseClient) throw new Error("Cocobase is not configured");

  const baseUrl = (env.COCOBASE_BASE_URL || "https://api.cocobase.cc").replace(
    /\/$/,
    "",
  );
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (env.COCOBASE_API_KEY) {
    headers["x-api-key"] = env.COCOBASE_API_KEY;
  }

  const token = cocobaseClient.auth.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method,
    headers,
    ...(options.body !== undefined
      ? {
          body: JSON.stringify(
            options.useDataKey === false
              ? options.body
              : { data: options.body },
          ),
        }
      : {}),
  });

  if (!response.ok) {
    let errorDetail: unknown = null;
    try {
      errorDetail = await response.json();
    } catch {
      try {
        await response.text();
      } catch {
        // Ignore parse failures and fall back to the generic message below.
      }
    }

    const message =
      typeof errorDetail === "string"
        ? errorDetail
        : errorDetail && typeof errorDetail === "object"
          ? JSON.stringify(errorDetail)
          : "Cocobase request failed";

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const cocobaseAuth = {
  async googleLogin(idToken: string, fallbackRole: Role = "earner") {
    if (!cocobaseClient) {
      throw new Error("Sign-in is not available right now.");
    }
    try {
      const appUser = await cocobaseClient.auth.loginWithGoogle({
        idToken,
      });
      const user = normalizeUser(appUser, fallbackRole);
      if (!user) throw new Error("Unable to sign in. Please try again.");
      return {
        user,
        token: cocobaseClient.auth.getToken() ?? "cocobase_token",
        refreshToken: "cocobase_refresh",
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.";
      throw new Error(message);
    }
  },

  async login(email: string, password: string) {
    if (!cocobaseClient) {
      throw new Error("Sign-in is not available right now.");
    }
    try {
      const result = await cocobaseClient.auth.login({ email, password });

      if (result.requires_2fa) {
        throw new Error(
          result.message ||
            "Additional verification is required to sign in.",
        );
      }

      const user = normalizeUser(result.user, "earner");
      if (!user) {
        throw new Error("Incorrect email or password.");
      }

      return {
        user,
        token: cocobaseClient.auth.getToken() ?? "cocobase_token",
        refreshToken: "cocobase_refresh",
      };
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },

  async register(payload: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    gender: string;
    password: string;
    role: Role;
  }) {
    const fullName = `${payload.firstName} ${payload.lastName}`.trim();

    if (cocobaseClient) {
      try {
        const result = await cocobaseClient.auth.register({
          email: payload.email,
          password: payload.password,
          data: {
            firstName: payload.firstName,
            lastName: payload.lastName,
            name: fullName,
            phoneNumber: payload.phoneNumber,
            dateOfBirth: payload.dateOfBirth,
            gender: payload.gender,
            role: payload.role,
          },
        });

        // The SDK's register() shape isn't fully confirmed from docs alone —
        // handle both a wrapped { user } response and a bare AppUser.
        const rawUser =
          (result as unknown as { user?: AppUser })?.user ??
          (result as unknown as AppUser);
        const user = normalizeUser(rawUser, payload.role);

        if (!user)
          throw new Error("Unable to create account. Please try again.");

        return {
          user,
          token: cocobaseClient.auth.getToken() ?? "cocobase_token",
          refreshToken: "cocobase_refresh",
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to create account. Please try again.";
        throw new Error(message);
      }
    }

    throw new Error("Unable to create account. Please try again.");
  },

  async getCurrentUser() {
    if (!cocobaseClient) return null;
    const user = await cocobaseClient.auth.getCurrentUser();
    return normalizeUser(user, "earner");
  },

  async requestEmailVerification() {
    await requestCocobase("/auth-collections/verify-email/send", {
      method: "POST",
      body: {},
      useDataKey: false,
    });
    return true;
  },

  async verifyEmail(token: string) {
    await requestCocobase("/auth-collections/verify-email/verify", {
      method: "POST",
      body: { token },
      useDataKey: false,
    });
    return true;
  },

  async resendVerificationEmail() {
    await requestCocobase("/auth-collections/verify-email/resend", {
      method: "POST",
      body: {},
      useDataKey: false,
    });
    return true;
  },

  async forgotPassword(email: string) {
    if (cocobaseClient) {
      try {
        await cocobaseClient.auth.requestPasswordReset(email);
        return true;
      } catch (error) {
        console.warn("Cocobase requestPasswordReset failed", error);
      }
    }

    // Never reveal whether the email exists — always resolve successfully.
    return true;
  },

  // IMPORTANT: The installed Cocobase SDK only exposes
  // `requestPasswordReset(email)` — there is no confirm/complete method in
  // its type definitions. The endpoint this needs to call to actually SET
  // the new password using the emailed token is not confirmed. Before using
  // this in production, check Cocobase's dashboard/support docs (or ask
  // their support) for the correct way to complete a password reset — do
  // not assume the endpoint below is correct, it is a placeholder guess.
  async resetPassword(token: string, password: string) {
    if (!cocobaseClient) {
      throw new Error("Password reset is not available right now.");
    }
    try {
      // TODO: CONFIRM this endpoint path with Cocobase before relying on it.
      await requestCocobase("/auth-collections/reset-password/confirm", {
        method: "POST",
        body: { token, password },
        useDataKey: false,
      });
      return true;
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },

  // Note: Cocobase's updateUser() sets a new password based on the CURRENT
  // authenticated session (there is no server-side check of the old
  // password in this SDK call) — the "current password" field in the UI
  // is a UX confirmation step, not something the SDK verifies itself.
  async changePassword(_currentPassword: string, newPassword: string) {
    if (!cocobaseClient) {
      throw new Error("Changing your password is not available right now.");
    }
    try {
      await cocobaseClient.auth.updateUser({ password: newPassword });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to change password.";
      throw new Error(message);
    }
  },
};

function readStoredCollection<T>(storageKey: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredCollection<T>(storageKey: string, items: T[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    // Ignore storage issues and continue with in-memory fallback.
  }
}

function normalizeTransaction(
  document: Document<Record<string, unknown>>,
): Transaction {
  const data = asRecord(document.data);

  return {
    id: asString(data.id) ?? document.id,
    type: (asString(data.type) as Transaction["type"] | undefined) ?? "deposit",
    amount: asNumber(data.amount),
    description: asString(data.description) ?? "",
    createdAt:
      asString(data.createdAt) ??
      asString(data.created_at) ??
      asString(document.created_at) ??
      "",
  };
}

function normalizeWithdrawal(
  document: Document<Record<string, unknown>>,
): Withdrawal {
  const data = asRecord(document.data);

  return {
    id: asString(data.id) ?? document.id,
    amount: asNumber(data.amount),
    method:
      (asString(data.method) as Withdrawal["method"] | undefined) ??
      "bank_transfer",
    accountDetails: asString(data.accountDetails) ?? "",
    bankName: asString(data.bankName),
    accountName: asString(data.accountName),
    accountNumber: asString(data.accountNumber),
    status:
      (asString(data.status) as Withdrawal["status"] | undefined) ?? "pending",
    createdAt:
      asString(data.createdAt) ??
      asString(data.created_at) ??
      asString(document.created_at) ??
      "",
  };
}

function normalizeNotification(
  document: Document<Record<string, unknown>>,
): Notification {
  const data = asRecord(document.data);

  return {
    id: asString(data.id) ?? document.id,
    type:
      (asString(data.type) as Notification["type"] | undefined) ?? "welcome",
    title: asString(data.title) ?? "Notification",
    message: asString(data.message) ?? "",
    isRead: asBoolean(data.isRead, false),
    createdAt:
      asString(data.createdAt) ??
      asString(data.created_at) ??
      asString(document.created_at) ??
      "",
  };
}

function readAvatarUrlFromPayload(payload: unknown): string | null {
  const root = asRecord(payload);
  const nestedData = asRecord(root.data);
  const mergedData = { ...nestedData, ...root } as Record<string, unknown>;

  return (
    asString(
      pickFirstDefined(
        mergedData.avatar,
        mergedData.profilePicture,
        mergedData.imageUrl,
        mergedData.url,
        nestedData.avatar,
        nestedData.profilePicture,
      ),
    ) ?? null
  );
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

function normalizeAdminUser(appUser: AppUser) {
  const normalized = normalizeUser(appUser, "earner");

  return {
    id: appUser.id,
    email: appUser.email,
    name: normalized?.name ?? appUser.email.split("@")[0] ?? "User",
    role: normalized?.role ?? "earner",
    createdAt: appUser.created_at,
    isEmailVerified: normalized?.isEmailVerified ?? false,
    avatar: normalized?.avatar ?? null,
    walletBalance: normalized?.walletBalance ?? 0,
  };
}

export const cocobaseNotifications = {
  async list(userId?: string) {
    if (!cocobaseClient) return [];

    try {
      const documents = await cocobaseClient.listDocuments<
        Record<string, unknown>
      >("notifications", {
        sort: "created_at",
        order: "desc",
      });

      return documents
        .filter((document) => {
          const data = asRecord(document.data);
          const docUserId = pickFirstDefined(
            asString(data.userId),
            asString(data.recipientId),
            asString(data.ownerId),
          );

          return !userId || !docUserId || docUserId === userId;
        })
        .map(normalizeNotification);
    } catch (error) {
      console.warn("Failed to load Cocobase notifications", error);
      return [];
    }
  },

  async create(payload: {
    userId: string;
    type: Notification["type"];
    title: string;
    message: string;
    isRead?: boolean;
    createdAt?: string;
  }) {
    const notificationPayload = {
      ...payload,
      isRead: payload.isRead ?? false,
      createdAt: payload.createdAt ?? new Date().toISOString(),
    };

    if (!cocobaseClient) {
      return {
        id: `local-notification-${Date.now()}`,
        ...notificationPayload,
      } as Notification;
    }

    try {
      const document = await cocobaseClient.createDocument(
        "notifications",
        notificationPayload,
      );
      return normalizeNotification(document);
    } catch (error) {
      console.warn("Failed to sync notification to Cocobase", error);
      return {
        id: `local-notification-${Date.now()}`,
        ...notificationPayload,
      } as Notification;
    }
  },

  subscribe(userId: string, onChange: (notifications: Notification[]) => void) {
    if (!cocobaseClient) {
      onChange([]);
      return () => undefined;
    }

    return cocobaseClient.onSnapshot<Record<string, unknown>>(
      "notifications",
      (documents) => {
        const nextNotifications = documents
          .filter((document) => {
            const data = asRecord(document.data);
            const docUserId = pickFirstDefined(
              asString(data.userId),
              asString(data.recipientId),
              asString(data.ownerId),
            );

            return !docUserId || docUserId === userId;
          })
          .map(normalizeNotification);

        onChange(nextNotifications);
      },
    );
  },
};

export const cocobaseAdmin = {
  async listUsers() {
    if (!cocobaseClient) return [];

    try {
      const response = await cocobaseClient.auth.listUsers({ limit: 100 });
      return (response?.data ?? []).map(normalizeAdminUser);
    } catch (error) {
      console.warn("Failed to load Cocobase users", error);
      return [];
    }
  },

  async listWithdrawals(userId?: string) {
    return cocobaseWallet.listWithdrawals(userId);
  },

  async updateWithdrawalStatus(
    withdrawalId: string,
    status: Withdrawal["status"],
  ) {
    if (!cocobaseClient) {
      return null;
    }

    try {
      const document = await cocobaseClient.updateDocument(
        "withdrawals",
        withdrawalId,
        { status },
      );
      return normalizeWithdrawal(document);
    } catch (error) {
      console.warn("Failed to update Cocobase withdrawal status", error);
      return null;
    }
  },

  async listTasks() {
    if (!cocobaseClient) return [];

    try {
      return cocobaseTasks.list();
    } catch (error) {
      console.warn("Failed to load Cocobase tasks for admin view", error);
      return [];
    }
  },
};

export const cocobaseProfile = {
  async updateName(userId: string, name: string) {
    const payload = {
      userId,
      name,
      updatedAt: new Date().toISOString(),
    };

    if (!cocobaseClient) {
      const existing =
        readStoredCollection<Record<string, unknown>>("zynk-profiles");
      const next = [
        ...existing.filter(
          (item) => (item.userId as string | undefined) !== userId,
        ),
        { id: `local-profile-${userId}`, ...payload },
      ];
      writeStoredCollection("zynk-profiles", next);
      return { id: `local-profile-${userId}`, ...payload };
    }

    try {
      const document = await cocobaseClient.createDocument("profiles", payload);
      return { id: document.id, ...payload };
    } catch (error) {
      console.warn(
        "Cocobase profile update failed; using local fallback",
        error,
      );
      const existing =
        readStoredCollection<Record<string, unknown>>("zynk-profiles");
      const next = [
        ...existing.filter(
          (item) => (item.userId as string | undefined) !== userId,
        ),
        { id: `local-profile-${userId}`, ...payload },
      ];
      writeStoredCollection("zynk-profiles", next);
      return { id: `local-profile-${userId}`, ...payload };
    }
  },

  async uploadAvatar(userId: string, file: File) {
    const localFallback = async () => {
      const avatarUrl = await toDataUrl(file);
      const existing =
        readStoredCollection<Record<string, unknown>>("zynk-profiles");
      const next = [
        ...existing.filter(
          (item) => (item.userId as string | undefined) !== userId,
        ),
        {
          id: `local-profile-${userId}`,
          userId,
          avatar: avatarUrl,
          updatedAt: new Date().toISOString(),
        },
      ];
      writeStoredCollection("zynk-profiles", next);
      return avatarUrl;
    };

    if (!cocobaseClient) {
      return localFallback();
    }

    try {
      const response = await cocobaseClient.auth.updateUserWithFiles({
        data: { updatedAt: new Date().toISOString() },
        files: { avatar: file },
      });
      const avatarUrl = readAvatarUrlFromPayload(response);
      if (avatarUrl) {
        return avatarUrl;
      }
      return localFallback();
    } catch (error) {
      console.warn("Cocobase avatar upload failed; using local preview", error);
      return localFallback();
    }
  },
};

export const cocobaseSubmissions = {
  async submit(payload: {
    taskId: string;
    taskTitle: string;
    platform: string;
    taskType: string;
    reward: number;
    proof: string;
    status?: string;
    createdAt?: string;
  }) {
    const submissionPayload = {
      ...payload,
      proof: payload.proof.trim(),
      status: payload.status ?? "pending",
      createdAt: payload.createdAt ?? new Date().toISOString(),
    };

    if (!cocobaseClient) {
      const existing =
        readStoredCollection<Record<string, unknown>>("zynk-submissions");
      const nextItem = {
        id: `local-submission-${Date.now()}`,
        ...submissionPayload,
      };
      writeStoredCollection("zynk-submissions", [nextItem, ...existing]);
      return nextItem;
    }

    try {
      const document = await cocobaseClient.createDocument(
        "submissions",
        submissionPayload,
      );
      return { id: document.id, ...submissionPayload };
    } catch (error) {
      console.warn(
        "Cocobase submission save failed; using local fallback",
        error,
      );
      const existing =
        readStoredCollection<Record<string, unknown>>("zynk-submissions");
      const nextItem = {
        id: `local-submission-${Date.now()}`,
        ...submissionPayload,
      };
      writeStoredCollection("zynk-submissions", [nextItem, ...existing]);
      return nextItem;
    }
  },

  async review(payload: {
    taskId: string;
    submissionId: string;
    action: "approve" | "reject";
    note?: string;
  }) {
    const reviewPayload = {
      ...payload,
      reviewedAt: new Date().toISOString(),
    };

    if (!cocobaseClient) {
      const existing = readStoredCollection<Record<string, unknown>>(
        "zynk-submission-reviews",
      );
      const nextItem = { id: `local-review-${Date.now()}`, ...reviewPayload };
      writeStoredCollection("zynk-submission-reviews", [nextItem, ...existing]);
      return nextItem;
    }

    try {
      const document = await cocobaseClient.createDocument(
        "submission_reviews",
        reviewPayload,
      );
      return { id: document.id, ...reviewPayload };
    } catch (error) {
      console.warn("Cocobase review save failed; using local fallback", error);
      const existing = readStoredCollection<Record<string, unknown>>(
        "zynk-submission-reviews",
      );
      const nextItem = { id: `local-review-${Date.now()}`, ...reviewPayload };
      writeStoredCollection("zynk-submission-reviews", [nextItem, ...existing]);
      return nextItem;
    }
  },
};

export const cocobaseWallet = {
  async verifyDeposit(
    reference: string,
    amount: number,
    userId?: string,
    delta?: number,
    description?: string,
  ) {
    const response = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, amount, userId, delta, description }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(payload.error || "Unable to verify payment.");
    }

    return response.json();
  },

  async reconcileWallet(userId: string, delta: number, description: string) {
    const response = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        delta,
        description,
        type: delta >= 0 ? "deposit" : "task_payment",
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(payload.error || "Unable to reconcile wallet balance.");
    }

    const payload = (await response.json().catch(() => ({}))) as {
      walletBalance?: number;
    };

    return payload.walletBalance ?? 0;
  },

  async listTransactions(userId?: string) {
    if (!cocobaseClient) return [];

    try {
      const documents = await cocobaseClient.listDocuments<
        Record<string, unknown>
      >("transactions", {
        sort: "created_at",
        order: "desc",
      });

      return documents
        .filter((document) => {
          const data = asRecord(document.data);
          return !userId || asString(data.userId) === userId;
        })
        .map(normalizeTransaction);
    } catch (error) {
      console.warn("Failed to load Cocobase transactions", error);
      return [];
    }
  },

  async createTransaction(payload: {
    userId: string;
    type: Transaction["type"];
    amount: number;
    description: string;
    createdAt?: string;
  }) {
    const transactionPayload = {
      ...payload,
      createdAt: payload.createdAt ?? new Date().toISOString(),
    };

    if (!cocobaseClient) {
      return {
        id: `local-transaction-${Date.now()}`,
        ...transactionPayload,
      } as Transaction;
    }

    try {
      const document = await cocobaseClient.createDocument(
        "transactions",
        transactionPayload,
      );
      return normalizeTransaction(document);
    } catch (error) {
      console.warn("Failed to sync transaction to Cocobase", error);
      return {
        id: `local-transaction-${Date.now()}`,
        ...transactionPayload,
      } as Transaction;
    }
  },

  async listWithdrawals(userId?: string) {
    if (!cocobaseClient) return [];

    try {
      const documents = await cocobaseClient.listDocuments<
        Record<string, unknown>
      >("withdrawals", {
        sort: "created_at",
        order: "desc",
      });

      return documents
        .filter((document) => {
          const data = asRecord(document.data);
          return !userId || asString(data.userId) === userId;
        })
        .map(normalizeWithdrawal);
    } catch (error) {
      console.warn("Failed to load Cocobase withdrawals", error);
      return [];
    }
  },

  async requestWithdrawal(payload: {
    userId: string;
    amount: number;
    method: string;
    accountDetails: string;
    status?: string;
    createdAt?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  }) {
    const withdrawalPayload = {
      ...payload,
      status: payload.status ?? "pending",
      createdAt: payload.createdAt ?? new Date().toISOString(),
    };

    if (!cocobaseClient) {
      return {
        id: `local-withdrawal-${Date.now()}`,
        ...withdrawalPayload,
      } as Withdrawal;
    }

    try {
      const document = await cocobaseClient.createDocument(
        "withdrawals",
        withdrawalPayload,
      );
      return normalizeWithdrawal(document);
    } catch (error) {
      console.warn("Failed to sync withdrawal to Cocobase", error);
      return {
        id: `local-withdrawal-${Date.now()}`,
        ...withdrawalPayload,
      } as Withdrawal;
    }
  },
};

export const cocobaseTasks = {
  // Purpose: load task records from Cocobase for the earner browse page and other task-driven views.
  async list() {
    if (!cocobaseClient) {
      throw new Error("Cocobase is not configured");
    }

    const documents = await cocobaseClient.listDocuments<
      Record<string, unknown>
    >("tasks", {
      sort: "created_at",
      order: "desc",
    });
    return documents.map(normalizeTask);
  },

  async create(
    payload: Omit<
      Task,
      "id" | "createdAt" | "slotsLeft" | "completionCount" | "status"
    > & {
      status?: Task["status"];
      completedByCurrentUser?: boolean;
      taskSubmissions?: Array<Record<string, unknown>>;
      advertiserId?: string;
      advertiserEmail?: string;
      advertiserDisplayName?: string;
      minQualityScore?: number;
    },
  ) {
    const taskPayload = {
      ...payload,
      advertiser: payload.advertiser ?? payload.advertiserId ?? "",
      advertiserId: payload.advertiserId ?? payload.advertiser ?? "",
      advertiserName:
        payload.advertiserName ?? payload.advertiserDisplayName ?? "Advertiser",
      advertiserEmail: payload.advertiserEmail ?? "",
      advertiserDisplayName:
        payload.advertiserDisplayName ?? payload.advertiserName ?? "Advertiser",
      createdAt: new Date().toISOString(),
      completionCount: 0,
      slotsLeft: payload.totalSlots,
      status: payload.status ?? "active",
      taskSubmissions: payload.taskSubmissions ?? [],
      minQualityScore: payload.minQualityScore ?? 0,
    };

    if (!cocobaseClient) {
      throw new Error("Cocobase is not configured");
    }

    const document = await cocobaseClient.createDocument("tasks", taskPayload);
    return normalizeTask(document);
  },

  async update(taskId: string, updates: Partial<Record<string, unknown>>) {
    if (!cocobaseClient) {
      throw new Error("Cocobase is not configured");
    }
    const document = await cocobaseClient.updateDocument(
      "tasks",
      taskId,
      updates,
    );
    return normalizeTask(document);
  },
};
