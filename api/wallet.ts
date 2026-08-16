import { Cocobase } from "cocobase";
import {
  DEFAULT_CURRENCY,
  findPaymentDocumentByReference,
  getBearerToken,
  getCurrentUserFromToken,
  getJsonBody,
  getUserWalletBalance,
  updatePaymentLedgerRecord,
  updateUserWalletBalance,
  validateDepositAmount,
  verifyPaystackTransaction,
} from "./_lib/payments";

async function getPaymentRecord(reference: string) {
  const record = await findPaymentDocumentByReference(reference);
  if (!record) return null;

  const data = (record as { data?: Record<string, unknown> }).data ?? record;
  return data as {
    status?: string;
    userId?: string;
    reference?: string;
  };
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
    reference?: string;
    amount?: number;
    accessToken?: string;
    userId?: string;
    delta?: number;
  };

  const accessToken = body.accessToken || getBearerToken(req.headers);
  if (!accessToken) {
    res.status(401).json({ error: "Unauthorized. Authentication required." });
    return;
  }

  const currentUser = await getCurrentUserFromToken(accessToken);
  if (!currentUser) {
    res.status(401).json({ error: "Invalid or expired authentication token." });
    return;
  }

  const userId = String(currentUser.id || "");
  const requestedReference = String(body.reference ?? "").trim();
  if (!requestedReference) {
    res.status(400).json({ error: "Missing payment reference." });
    return;
  }

  if (body.userId && body.userId !== userId) {
    res.status(403).json({ error: "User mismatch." });
    return;
  }

  try {
    const amountFromRequest =
      body.amount !== undefined ? Number(body.amount) : undefined;
    if (amountFromRequest !== undefined) {
      validateDepositAmount(amountFromRequest);
    }

    const verified = await verifyPaystackTransaction(requestedReference);
    const verifiedAmount = Number((verified.amount ?? 0) / 100);
    const currency = String(
      verified.currency ?? DEFAULT_CURRENCY,
    ).toUpperCase();

    if (currency !== DEFAULT_CURRENCY) {
      throw new Error("Only NGN wallet funding is supported.");
    }

    const existingRecord = await getPaymentRecord(requestedReference);
    const existingStatus = String(existingRecord?.status ?? "").toLowerCase();

    if (existingStatus === "success") {
      const walletBalance = await getUserWalletBalance(userId);
      res.status(200).json({
        success: true,
        reference: requestedReference,
        status: "success",
        amount: verifiedAmount,
        walletBalance,
        alreadyProcessed: true,
      });
      return;
    }

    if (body.amount !== undefined && Number(body.amount) !== verifiedAmount) {
      throw new Error("Payment amount mismatch.");
    }

    if (existingRecord && String(existingRecord.userId ?? "") !== userId) {
      throw new Error(
        "This transaction does not belong to the authenticated user.",
      );
    }

    const client = new Cocobase({
      apiKey: process.env.COCOBASE_API_KEY || "",
      projectId: process.env.COCOBASE_PROJECT_ID || "",
      baseURL:
        process.env.COCOBASE_BASE_URL ||
        process.env.VITE_COCOBASE_BASE_URL ||
        "https://api.cocobase.cc",
      timeout: 60000,
    });

    const existing = await findPaymentDocumentByReference(requestedReference);
    if (!existing) {
      await client.createDocument("transactions", {
        userId,
        reference: requestedReference,
        amount: verifiedAmount,
        currency,
        type: "deposit",
        status: "success",
        provider: "paystack",
        providerTransactionId: verified.id ? String(verified.id) : null,
        email: verified.customer?.email ?? currentUser.email ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    }

    const currentBalance = await getUserWalletBalance(userId);
    const nextBalance = currentBalance + verifiedAmount;
    await updateUserWalletBalance(userId, nextBalance);
    await updatePaymentLedgerRecord(requestedReference, {
      userId,
      reference: requestedReference,
      amount: verifiedAmount,
      currency,
      status: "success",
      provider: "paystack",
      providerTransactionId: verified.id ? String(verified.id) : null,
      completedAt: new Date().toISOString(),
      walletBalance: nextBalance,
    });

    res.status(200).json({
      success: true,
      reference: requestedReference,
      status: "success",
      amount: verifiedAmount,
      walletBalance: nextBalance,
      alreadyProcessed: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to verify payment.";
    res.status(400).json({ error: message });
  }
}
