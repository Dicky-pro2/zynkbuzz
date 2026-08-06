const PAYSTACK_VERIFY_URL = "https://api.paystack.co/transaction/verify";

function getSecret() {
  return process.env.PAYSTACK_SECRET_KEY || "";
}

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

async function verifyPaystackTransaction(
  reference: string,
  expectedAmount: number,
) {
  const secret = getSecret();
  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }

  const response = await fetch(
    `${PAYSTACK_VERIFY_URL}/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Unable to verify payment with Paystack.");
  }

  const payload = (await response.json()) as {
    status: boolean;
    message?: string;
    data?: {
      status?: string;
      amount?: number;
      currency?: string;
      reference?: string;
      customer?: { email?: string };
    };
  };

  if (!payload.status || payload.data?.status !== "success") {
    throw new Error(payload.message || "Payment verification failed.");
  }

  if (!payload.data?.amount || payload.data.amount / 100 !== expectedAmount) {
    throw new Error("Payment amount mismatch.");
  }

  return payload.data;
}

function getJsonBody(req: { method?: string; body?: unknown }) {
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

export default async function handler(
  req: { method?: string; body?: unknown },
  res: { status: (code: number) => { json: (payload: unknown) => void } },
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = getJsonBody(req) as {
    reference?: string;
    amount?: number;
    userId?: string;
    delta?: number;
    description?: string;
    type?: string;
    accessToken?: string;
  };

  if (!body.reference) {
    res.status(400).json({ error: "Missing reference" });
    return;
  }

  try {
    const verified = await verifyPaystackTransaction(
      body.reference,
      body.amount ?? 0,
    );

    if (body.userId && typeof body.delta === "number") {
      if (!body.accessToken) {
        throw new Error(
          "Missing access token — cannot verify which user to credit.",
        );
      }

      const { apiKey, projectId, baseURL } = getCocobaseConfig();
      if (!apiKey || !projectId) {
        throw new Error(
          "Cocobase credentials are not configured on the server.",
        );
      }

      const { Cocobase } = await import("cocobase");
      const client = new Cocobase({
        apiKey,
        projectId,
        baseURL,
        timeout: 60000,
      });

      // Scope this client instance to the requesting user's own session —
      // this is what makes it safe to call getCurrentUser()/updateUser()
      // here: without this, there is no session at all, and updateUser()
      // would have no reliable way to know whose balance to change.
      client.auth.setToken(body.accessToken);

      const currentUser = await client.auth.getCurrentUser();

      // Verify the token actually belongs to the userId the client claims
      // to be crediting — never trust userId alone from the request body.
      if (currentUser.id !== body.userId) {
        throw new Error("Token does not match the requested user.");
      }

      const currentBalance = Number(currentUser?.data?.walletBalance ?? 0);
      const nextBalance = Math.max(0, currentBalance + body.delta);
      await client.auth.updateUser({
        data: {
          walletBalance: nextBalance,
          updatedAt: new Date().toISOString(),
        },
      });

      await client.createDocument("transactions", {
        userId: body.userId,
        type: body.type ?? "deposit",
        amount: body.delta,
        description: body.description ?? "Wallet update",
        createdAt: new Date().toISOString(),
      });

      res
        .status(200)
        .json({
          verified,
          reference: body.reference,
          walletBalance: nextBalance,
        });
      return;
    }

    res.status(200).json({ verified, reference: body.reference });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Verification failed";
    res.status(400).json({ error: message });
  }
}
