import crypto from "node:crypto";
import { Cocobase } from "cocobase";
import { sendWalletFundedEmail } from "./email";

export const MIN_DEPOSIT_AMOUNT = 100;
export const MAX_DEPOSIT_AMOUNT = 500000;
export const DEFAULT_CURRENCY = "NGN";

export type PaymentStatus = "pending" | "success" | "failed" | "reversed";

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

export function getBearerToken(
  headers?: Record<string, string | string[] | undefined>,
) {
  const auth = headers?.authorization || headers?.Authorization;
  if (typeof auth === "string") {
    const match = auth.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : "";
  }
  return "";
}

export async function getCurrentUserFromToken(accessToken: string) {
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

export function validateDepositAmount(input: unknown): number {
  const rawValue = typeof input === "string" ? Number(input.trim()) : input;

  if (typeof rawValue !== "number" || Number.isNaN(rawValue)) {
    throw new Error("Deposit amount must be a valid number.");
  }

  if (!Number.isFinite(rawValue) || !Number.isInteger(rawValue)) {
    throw new Error("Deposit amount must be a whole NGN amount.");
  }

  if (rawValue <= 0) {
    throw new Error("Deposit amount must be greater than zero.");
  }

  if (rawValue < MIN_DEPOSIT_AMOUNT || rawValue > MAX_DEPOSIT_AMOUNT) {
    throw new Error(
      `Deposit amount must be between ₦${MIN_DEPOSIT_AMOUNT.toLocaleString()} and ₦${MAX_DEPOSIT_AMOUNT.toLocaleString()}.`,
    );
  }

  return rawValue;
}

export function generatePaymentReference(userId: string) {
  const random = crypto.randomBytes(24).toString("hex");
  return `pay_${userId}_${random}`;
}

export async function getCocobaseClient() {
  const { apiKey, projectId, baseURL } = getCocobaseConfig();
  if (!apiKey || !projectId) {
    throw new Error("Cocobase credentials are not configured on the server.");
  }

  return new Cocobase({
    apiKey,
    projectId,
    baseURL,
    timeout: 60000,
  });
}

export async function findPaymentDocumentByReference(reference: string) {
  const client = await getCocobaseClient();

  const documents = await client
    .listDocuments<Record<string, unknown>>("transactions", {
      sort: "created_at",
      order: "desc",
    })
    .catch(() => []);

  return documents.find((document) => {
    const data = (document as { data?: Record<string, unknown> }).data ?? {};
    return String(data.reference ?? "") === reference;
  });
}

export async function ensurePaymentLedgerRecord(payload: {
  userId: string;
  reference: string;
  amount: number;
  currency: string;
  provider: string;
  providerTransactionId?: string | null;
  status: PaymentStatus;
  email?: string;
}) {
  const client = await getCocobaseClient();
  const existing = await findPaymentDocumentByReference(payload.reference);

  if (existing) {
    return existing;
  }

  return client.createDocument("transactions", {
    userId: payload.userId,
    reference: payload.reference,
    amount: payload.amount,
    currency: payload.currency,
    type: "deposit",
    status: payload.status,
    provider: payload.provider,
    providerTransactionId: payload.providerTransactionId ?? null,
    email: payload.email ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: payload.status === "success" ? new Date().toISOString() : null,
  });
}

export async function updatePaymentLedgerRecord(
  reference: string,
  updates: Record<string, unknown>,
) {
  const existing = await findPaymentDocumentByReference(reference);
  if (!existing) return null;

  const client = await getCocobaseClient();
  return client.updateDocument("transactions", String(existing.id), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function getUserWalletBalance(userId: string) {
  const { apiKey, projectId, baseURL } = getCocobaseConfig();
  if (!apiKey || !projectId) {
    throw new Error("Cocobase credentials are not configured on the server.");
  }

  const response = await fetch(
    `${baseURL}/auth/users/${encodeURIComponent(userId)}`,
    {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Unable to load wallet balance for the user.");
  }

  const payload = (await response.json().catch(() => ({}))) as {
    data?: { walletBalance?: number };
    walletBalance?: number;
  };

  const data = payload.data ?? payload;
  return Number(data.walletBalance ?? 0);
}

export async function updateUserWalletBalance(
  userId: string,
  walletBalance: number,
) {
  const { apiKey, baseURL } = getCocobaseConfig();
  if (!apiKey) {
    throw new Error("Cocobase credentials are not configured on the server.");
  }

  const response = await fetch(
    `${baseURL}/auth/users/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          walletBalance,
          updatedAt: new Date().toISOString(),
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Unable to update the wallet balance.");
  }

  return await response.json().catch(() => ({}));
}

export async function verifyPaystackTransaction(reference: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    status?: boolean;
    message?: string;
    data?: {
      status?: string;
      amount?: number;
      currency?: string;
      reference?: string;
      id?: string | number;
      customer?: { email?: string };
    };
  };

  if (!response.ok || !payload.status || payload.data?.status !== "success") {
    throw new Error(payload.message || "Payment verification failed.");
  }

  const transaction = payload.data;
  if (!transaction || !transaction.reference) {
    throw new Error("Paystack transaction reference is missing.");
  }

  return transaction;
}

export async function processSuccessfulPayment(
  reference: string,
  userId?: string,
) {
  const transaction = await verifyPaystackTransaction(reference);
  const verifiedAmount = Number((transaction.amount ?? 0) / 100);
  const currency = String(
    transaction.currency ?? DEFAULT_CURRENCY,
  ).toUpperCase();

  if (currency !== DEFAULT_CURRENCY) {
    throw new Error("Only NGN wallet funding is supported.");
  }

  if (!userId) {
    const existing = await findPaymentDocumentByReference(reference);
    const docUserId = String(
      ((existing as { data?: Record<string, unknown> } | undefined)?.data
        ?.userId as string | undefined) ?? "",
    );

    if (!docUserId) {
      throw new Error("No user is associated with this payment reference.");
    }

    userId = docUserId;
  }

  const record = await ensurePaymentLedgerRecord({
    userId,
    reference,
    amount: verifiedAmount,
    currency,
    provider: "paystack",
    providerTransactionId: transaction.id ? String(transaction.id) : null,
    status: "pending",
    email: transaction.customer?.email ?? undefined,
  });

  const recordData = ((record as { data?: Record<string, unknown> } | undefined)
    ?.data ?? record) as Record<string, unknown>;

  if (String(recordData.status ?? "") === "success") {
    const walletBalance = await getUserWalletBalance(userId);
    const hasEmailSent = Boolean(
      recordData.emailSentAt || recordData.email_sent_at,
    );
    if (!hasEmailSent && transaction.customer?.email) {
      try {
        await sendWalletFundedEmail({
          to: transaction.customer.email,
          name: transaction.customer.email.split("@")[0],
          amount: verifiedAmount,
          reference,
          balance: walletBalance,
        });
        await updatePaymentLedgerRecord(reference, {
          emailSentAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to send wallet-funded email", error);
      }
    }

    return {
      reference,
      status: "success",
      amount: verifiedAmount,
      walletBalance,
      credited: false,
      alreadyProcessed: true,
    };
  }

  const currentWallet = await getUserWalletBalance(userId);
  const nextBalance = currentWallet + verifiedAmount;

  await updateUserWalletBalance(userId, nextBalance);
  await updatePaymentLedgerRecord(reference, {
    userId,
    amount: verifiedAmount,
    currency,
    status: "success",
    provider: "paystack",
    providerTransactionId: transaction.id ? String(transaction.id) : null,
    completedAt: new Date().toISOString(),
    walletBalance: nextBalance,
    emailSentAt: null,
  });

  let emailSent = false;
  if (transaction.customer?.email) {
    try {
      await sendWalletFundedEmail({
        to: transaction.customer.email,
        name: transaction.customer.email.split("@")[0],
        amount: verifiedAmount,
        reference,
        balance: nextBalance,
      });
      await updatePaymentLedgerRecord(reference, {
        emailSentAt: new Date().toISOString(),
      });
      emailSent = true;
    } catch (error) {
      console.error("Failed to send wallet-funded email", error);
    }
  }

  return {
    reference,
    status: "success",
    amount: verifiedAmount,
    walletBalance: nextBalance,
    credited: true,
    alreadyProcessed: false,
    emailSent,
  };
}

export function getJsonBody(req: { method?: string; body?: unknown }) {
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
