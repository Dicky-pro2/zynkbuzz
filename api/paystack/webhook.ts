import crypto from "node:crypto";
import {
  DEFAULT_CURRENCY,
  ensurePaymentLedgerRecord,
  getUserWalletBalance,
  updatePaymentLedgerRecord,
  updateUserWalletBalance,
  verifyPaystackTransaction,
} from "../_lib/payments";

function getRawBody(req: { rawBody?: unknown; body?: unknown }) {
  if (req.rawBody !== undefined) return req.rawBody;
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  return JSON.stringify(req.body ?? {});
}

function getSignature(req: {
  headers?: Record<string, string | string[] | undefined>;
}) {
  const header =
    req.headers?.["x-paystack-signature"] ||
    req.headers?.["X-Paystack-Signature"];
  if (typeof header === "string") return header;
  if (Array.isArray(header) && header[0]) return header[0];
  return "";
}

export default async function handler(
  req: {
    method?: string;
    body?: unknown;
    rawBody?: unknown;
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

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    res.status(500).json({ error: "PAYSTACK_SECRET_KEY is not configured." });
    return;
  }

  const rawBody = getRawBody(req);
  const signature = getSignature(req);
  const digest = crypto
    .createHmac("sha512", secret)
    .update(typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody))
    .digest("hex");

  if (!signature || digest.length !== signature.length) {
    res.status(401).json({ error: "Invalid Paystack signature." });
    return;
  }

  if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
    res.status(401).json({ error: "Invalid Paystack signature." });
    return;
  }

  let payload: {
    event?: string;
    data?: {
      status?: string;
      amount?: number;
      currency?: string;
      reference?: string;
      id?: string | number;
      customer?: { email?: string };
      metadata?: {
        userId?: string;
        transactionType?: string;
        reference?: string;
      };
    };
  };

  try {
    payload = JSON.parse(
      typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody),
    );
  } catch {
    res.status(400).json({ error: "Invalid webhook payload." });
    return;
  }

  const event = payload.event;
  const data = payload.data;

  if (event !== "charge.success") {
    res.status(200).json({ received: true, event });
    return;
  }

  if (!data?.reference) {
    res.status(400).json({ error: "Missing Paystack reference." });
    return;
  }

  try {
    const verified = await verifyPaystackTransaction(data.reference);
    const reference = verified.reference || data.reference;
    const amount = Number((verified.amount ?? data.amount ?? 0) / 100);
    const currency = String(
      verified.currency ?? data.currency ?? DEFAULT_CURRENCY,
    ).toUpperCase();
    const userId = String(data.metadata?.userId || "").trim();

    if (!userId) {
      throw new Error(
        "No user is associated with this Paystack payment reference.",
      );
    }

    const existingRecord = await ensurePaymentLedgerRecord({
      userId,
      reference,
      amount,
      currency,
      provider: "paystack",
      providerTransactionId: verified.id ? String(verified.id) : null,
      status: "pending",
      email: data.customer?.email,
    });
    const existingStatus = String(
      ((existingRecord as { data?: Record<string, unknown> } | undefined)?.data
        ?.status ??
        "") ||
        "",
    );

    if (existingStatus === "success") {
      res.status(200).json({ received: true, status: "already_processed" });
      return;
    }

    if (currency !== DEFAULT_CURRENCY) {
      throw new Error("Only NGN wallet funding is supported.");
    }

    const currentBalance = await getUserWalletBalance(userId);
    const nextBalance = currentBalance + amount;
    await updateUserWalletBalance(userId, nextBalance);
    await updatePaymentLedgerRecord(reference, {
      userId,
      reference,
      amount,
      currency,
      status: "success",
      provider: "paystack",
      providerTransactionId: verified.id ? String(verified.id) : null,
      completedAt: new Date().toISOString(),
      walletBalance: nextBalance,
    });

    res.status(200).json({
      received: true,
      reference,
      status: "success",
      amount,
      walletBalance: nextBalance,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process webhook.";
    res.status(400).json({ error: message });
  }
}
