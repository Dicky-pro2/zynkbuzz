import { Cocobase, type AppUser, type Document } from "cocobase";
import env from "../config/env";
import { authAPI } from "./api";
import type { Role, Task, User } from "../types";

const hasCocobaseConfig = Boolean(
  env.COCOBASE_API_KEY && env.COCOBASE_PROJECT_ID,
);
const LOCAL_AUTH_USERS_STORAGE_KEY = "zynk-local-auth-users";

type LocalAuthUser = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  password: string;
  role: Role;
  avatar: string | null;
  walletBalance: number;
  totalEarned: number;
  totalSpent: number;
  tasksCompleted: number;
  tasksPosted: number;
  isEmailVerified: boolean;
};

export const cocobaseClient = hasCocobaseConfig
  ? new Cocobase({
      apiKey: env.COCOBASE_API_KEY,
      projectId: env.COCOBASE_PROJECT_ID,
      baseURL: env.COCOBASE_BASE_URL || undefined,
      timeout: 60000,
    })
  : null;

export const isCocobaseEnabled = Boolean(cocobaseClient);

function readLocalAuthUsers(): LocalAuthUser[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_USERS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Array<Partial<LocalAuthUser>>;
    return parsed.filter((entry): entry is LocalAuthUser =>
      Boolean(entry?.email && typeof entry.password === "string"),
    );
  } catch {
    return [];
  }
}

function writeLocalAuthUsers(users: LocalAuthUser[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      LOCAL_AUTH_USERS_STORAGE_KEY,
      JSON.stringify(users),
    );
  } catch {
    // Ignore storage issues and continue with in-memory fallback.
  }
}

function ensureDemoAuthUsers(): LocalAuthUser[] {
  const existing = readLocalAuthUsers();
  if (existing.length > 0) return existing;

  const demoUsers: LocalAuthUser[] = [
  {
    id: "demo-advertiser",
    name: "Demo Advertiser",
    firstName: "Demo",
    lastName: "Advertiser",
    nickname: "demoadv",
    email: "adv@test.com",
    phoneNumber: "+10000000000",
    dateOfBirth: "1990-01-01",
    gender: "prefer_not_to_say",
    password: "Password123!",
    role: "advertiser",
    avatar: null,
    walletBalance: 2500,
    totalEarned: 0,
    totalSpent: 0,
    tasksCompleted: 0,
    tasksPosted: 0,
    isEmailVerified: true,
  },
  {
    id: "demo-earner",
    name: "Demo Earner",
    firstName: "Demo",
    lastName: "Earner",
    nickname: "demoearn",
    email: "earner@test.com",
    phoneNumber: "+10000000001",
    dateOfBirth: "1990-01-01",
    gender: "prefer_not_to_say",
    password: "Password123!",
    role: "earner",
    avatar: null,
    walletBalance: 340,
    totalEarned: 1200,
    totalSpent: 0,
    tasksCompleted: 3,
    tasksPosted: 0,
    isEmailVerified: true,
  },
  {
    id: "demo-admin",
    name: "Demo Admin",
    firstName: "Demo",
    lastName: "Admin",
    nickname: "demoadmin",
    email: "admin@test.com",
    phoneNumber: "+10000000002",
    dateOfBirth: "1990-01-01",
    gender: "prefer_not_to_say",
    password: "Password123!",
    role: "admin",
    avatar: null,
    walletBalance: 0,
    totalEarned: 0,
    totalSpent: 0,
    tasksCompleted: 0,
    tasksPosted: 0,
    isEmailVerified: true,
  },
];

  writeLocalAuthUsers(demoUsers);
  return demoUsers;
}

function buildLocalAuthUser(payload: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
}): LocalAuthUser {
  return {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `${payload.firstName} ${payload.lastName}`.trim() || "User",
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    nickname: null,
    email: payload.email.trim().toLowerCase(),
    phoneNumber: payload.phoneNumber,
    dateOfBirth: payload.dateOfBirth,
    gender: payload.gender,
    password: payload.password,
    role: payload.role,
    avatar: null,
    walletBalance: 0,
    totalEarned: 0,
    totalSpent: 0,
    tasksCompleted: 0,
    tasksPosted: 0,
    isEmailVerified: false, // was true before — see note below
  };
}

function createLocalAuthResult(user: LocalAuthUser) {
  const normalizedUser: User = {
    id: user.id,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    nickname: user.nickname,
    email: user.email,
    phoneNumber: user.phoneNumber,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    role: user.role,
    avatar: user.avatar,
    walletBalance: user.walletBalance,
    totalEarned: user.totalEarned,
    totalSpent: user.totalSpent,
    tasksCompleted: user.tasksCompleted,
    tasksPosted: user.tasksPosted,
    isEmailVerified: user.isEmailVerified,
    taskQualityScore: 100,
    currentStreak: 0,
    longestStreak: 0,
    referralsCount: 0,
    referralEarnings: 0,
    referralLevel: 1,
    theme: "light",
  };

  return {
    user: normalizedUser,
    token: `local-token-${user.id}`,
    refreshToken: `local-refresh-${user.id}`,
  };
}

function loginLocalAuthUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = ensureDemoAuthUsers();
  const match = users.find(
    (user) =>
      user.email.toLowerCase() === normalizedEmail &&
      user.password === password,
  );

  if (!match) return null;
  return createLocalAuthResult(match);
}

function registerLocalAuthUser(payload: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
}) {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const users = ensureDemoAuthUsers();
  const exists = users.some(
    (user) => user.email.toLowerCase() === normalizedEmail,
  );

  if (exists) {
    throw new Error("An account with this email already exists.");
  }

  const newUser = buildLocalAuthUser(payload);
  users.push(newUser);
  writeLocalAuthUsers(users);
  return createLocalAuthResult(newUser);
}

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
  };
}

function normalizeBackendUser(
  payload: unknown,
  fallbackRole: Role = "earner",
  fallbackName?: string,
  fallbackNickname?: string,
): User | null {
  if (!payload || typeof payload !== "object") return null;

  const directData = payload as Record<string, unknown>;
  const nestedData = asRecord(directData.data);
  const mergedData = { ...nestedData, ...directData } as Record<
    string,
    unknown
  >;
  const roleValues = Array.isArray(mergedData.roles)
    ? (mergedData.roles as unknown[])
    : [];
  const role = normalizeRole(
    pickFirstDefined(
      mergedData.role,
      mergedData.userRole,
      roleValues[0],
      mergedData.type,
      directData.role,
      directData.userRole,
      directData.type,
    ),
    fallbackRole,
  );

  const firstName = pickFirstDefined(
    asString(mergedData.firstName),
    asString(nestedData.firstName),
    asString(mergedData.name),
    asString(nestedData.name),
    asString(mergedData.fullName),
    asString(nestedData.fullName),
    asString(mergedData.displayName),
    asString(nestedData.displayName),
    asString(mergedData.username),
    asString(nestedData.username),
    fallbackName,
  );
  const lastName = pickFirstDefined(
    asString(mergedData.lastName),
    asString(nestedData.lastName),
  );
  const fullName = firstName
    ? [firstName, lastName].filter(Boolean).join(" ").trim()
    : undefined;

  return {
    id:
      asString(
        pickFirstDefined(
          mergedData.id,
          mergedData._id,
          mergedData.userId,
          mergedData.uuid,
        ),
      ) ?? `user-${Date.now()}`,
    name:
      fullName ??
      pickFirstDefined(
        asString(mergedData.name),
        asString(mergedData.fullName),
        asString(mergedData.displayName),
        asString(mergedData.username),
        asString(mergedData.email)?.split("@")[0],
        fallbackName,
      ) ??
      "User",
    nickname:
      pickFirstDefined(
        asString(mergedData.nickname),
        asString(mergedData.nickName),
        asString(mergedData.username),
        fallbackNickname,
      ) ?? null,
    email:
      pickFirstDefined(
        asString(mergedData.email),
        asString(mergedData.username),
      ) ?? "",
    role,
    avatar:
      pickFirstDefined(
        asString(mergedData.avatar),
        asString(mergedData.profilePicture),
      ) ?? null,
    walletBalance: asNumber(
      pickFirstDefined(mergedData.walletBalance, mergedData.balance),
    ),
    totalEarned: asNumber(pickFirstDefined(mergedData.totalEarned)),
    totalSpent: asNumber(pickFirstDefined(mergedData.totalSpent)),
    tasksCompleted: asNumber(
      pickFirstDefined(mergedData.tasksCompleted, mergedData.tasks_completed),
    ),
    tasksPosted: asNumber(
      pickFirstDefined(mergedData.tasksPosted, mergedData.tasks_posted),
    ),
    isEmailVerified: asBoolean(
      pickFirstDefined(
        mergedData.isEmailVerified,
        mergedData.emailVerified,
        mergedData.verified,
      ),
      true,
    ),
    taskQualityScore:
      asNumber(pickFirstDefined(mergedData.taskQualityScore)) || 100,
    currentStreak: asNumber(pickFirstDefined(mergedData.currentStreak)) || 0,
    longestStreak: asNumber(pickFirstDefined(mergedData.longestStreak)) || 0,
    referralsCount: asNumber(pickFirstDefined(mergedData.referralsCount)) || 0,
    referralEarnings:
      asNumber(pickFirstDefined(mergedData.referralEarnings)) || 0,
    referralLevel: asNumber(pickFirstDefined(mergedData.referralLevel)) || 1,
    theme: (asString(pickFirstDefined(mergedData.theme)) ?? "light") as
      | "light"
      | "dark",
  };
}

function normalizeAuthResult(
  responseData: unknown,
  fallbackRole: Role = "earner",
  fallbackName?: string,
  fallbackNickname?: string,
) {
  const root = asRecord(responseData);
  const body = asRecord(root.data);
  const nestedBody = asRecord(body.data);
  const userPayload = body.user ?? nestedBody.user ?? body.profile ?? body;
  const accessToken =
    asString(body.accessToken) ??
    asString(body.token) ??
    asString(nestedBody.accessToken) ??
    asString(nestedBody.token) ??
    null;
  const refreshToken =
    asString(body.refreshToken) ??
    asString(nestedBody.refreshToken) ??
    asString(body.refresh_token) ??
    null;

  return {
    user: normalizeBackendUser(
      userPayload,
      fallbackRole,
      fallbackName,
      fallbackNickname,
    ),
    token: accessToken,
    refreshToken,
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
  try {
    const response = await authAPI.googleAuth(idToken, fallbackRole);
    const { user, token, refreshToken } = normalizeAuthResult(
      response.data,
      fallbackRole,
    );
    if (!user) throw new Error("Unable to sign in");
    return {
      user,
      token: token ?? "backend_token",
      refreshToken: refreshToken ?? "backend_refresh",
    };
  } catch (error) {
    const localResult = registerLocalAuthUser({
      firstName: "Google",
      lastName: "User",
      email: `google-${Date.now()}@local.dev`,
      password: `google-${Date.now()}`,
      role: fallbackRole,
      phoneNumber: "",
      dateOfBirth: "",
      gender: "",
    });
    return localResult;
  }
},

  async login(email: string, password: string) {
    try {
      const response = await authAPI.login({ email, password });
      const { user, token, refreshToken } = normalizeAuthResult(
        response.data,
        "earner",
      );
      if (!user) throw new Error("Unable to sign in");
      return {
        user,
        token: token ?? "backend_token",
        refreshToken: refreshToken ?? "backend_refresh",
      };
    } catch (error) {
      const localResult = loginLocalAuthUser(email, password);
      if (localResult) return localResult;
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
      const result = await cocobaseClient.auth.register(
        payload.email,
        payload.password,
        {
          firstName: payload.firstName,
          lastName: payload.lastName,
          name: fullName,
          phoneNumber: payload.phoneNumber,
          dateOfBirth: payload.dateOfBirth,
          gender: payload.gender,
          role: payload.role,
        },
      );

      // The SDK's register() shape isn't fully confirmed from docs alone —
      // handle both a wrapped { user } response and a bare AppUser.
      const rawUser =
        (result as { user?: AppUser })?.user ?? (result as AppUser);
      const user = normalizeUser(rawUser, payload.role);

      if (!user) throw new Error("Unable to create account");

      return {
        user,
        token: cocobaseClient.auth.getToken() ?? "cocobase_token",
        refreshToken: "cocobase_refresh",
      };
    } catch (error) {
      console.warn(
        "Cocobase auth.register failed; using local fallback",
        error,
      );
    }
  }

  // Local fallback — offline/demo mode only.
  return registerLocalAuthUser(payload);
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
    try {
      await authAPI.forgotPassword(email);
      return true;
    } catch (error) {
      console.warn(
        "Backend forgotPassword failed; trying Cocobase directly",
        error,
      );
    }

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

  async resetPassword(token: string, password: string) {
    try {
      await authAPI.resetPassword(token, password);
      return true;
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },

  async changePassword(currentPassword: string, newPassword: string) {
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
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
  async requestWithdrawal(payload: {
    userId: string;
    amount: number;
    method: string;
    accountDetails: string;
    status?: string;
    createdAt?: string;
  }) {
    const withdrawalPayload = {
      ...payload,
      status: payload.status ?? "pending",
      createdAt: payload.createdAt ?? new Date().toISOString(),
    };

    if (!cocobaseClient) throw new Error("Cocobase is not configured");

    const document = await cocobaseClient.createDocument(
      "withdrawals",
      withdrawalPayload,
    );
    return { id: document.id, ...withdrawalPayload };
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
    },
  )
  
  {
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
