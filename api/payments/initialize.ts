import {
  getCurrentUserFromToken,
  getBearerToken,
  validateDepositAmount,
  generatePaymentReference,
} from "../_lib/payments";

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

  const body = (
    typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {})
  ) as {
    amount?: number | string;
    userId?: string;
    email?: string;
  };

  const accessToken = getBearerToken(req.headers);
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
  const email = String(currentUser.email || body.email || "")
    .trim()
    .toLowerCase();

  if (body.userId && body.userId !== userId) {
    res.status(403).json({ error: "User mismatch." });
    return;
  }

  const rawAmount = body.amount;
  let amount: number;

  try {
    amount = validateDepositAmount(rawAmount);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid deposit amount.";
    res.status(400).json({ error: message });
    return;
  }

  if (!email) {
    res
      .status(400)
      .json({ error: "User email is required to initialize payment." });
    return;
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    res.status(500).json({ error: "PAYSTACK_SECRET_KEY is not configured." });
    return;
  }

  const publicKey = process.env.VITE_PAYSTACK_PUBLIC_KEY || "";
  const reference = generatePaymentReference(userId);
  const paystackPayload = {
    email,
    amount: Math.round(amount * 100),
    currency: "NGN",
    reference,
    metadata: {
      userId,
      transactionType: "wallet_funding",
      reference,
    },
  };

  try {
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paystackPayload),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as {
      status?: boolean;
      message?: string;
      data?: {
        authorization_url?: string;
        access_code?: string;
        reference?: string;
      };
    };

    if (!response.ok || !payload.status || !payload.data?.authorization_url) {
      throw new Error(
        payload.message || "Unable to initialize payment with Paystack.",
      );
    }

    res.status(200).json({
      success: true,
      reference: payload.data.reference || reference,
      authorizationUrl: payload.data.authorization_url,
      accessCode: payload.data.access_code,
      publicKey,
      amount,
      currency: "NGN",
      email,
      userId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to initialize payment.";
    res.status(400).json({ error: message });
  }
}
