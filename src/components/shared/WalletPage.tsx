import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icons } from "../icons/Icons";
import { useAuthStore } from "../../store/authStore";
import { useAppStore } from "../../store/appStore";
import { cocobaseWallet } from "../../services/cocobase";
import { notify } from "../../utils/notify";
import env from "../../config/env";
import type { TransactionType } from "../../types";

const FUND_AMOUNTS = [100, 500, 1000, 5000];
const PAYSTACK_SCRIPT_URL = "https://js.paystack.co/v1/inline.js";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

const TX_META: Record<
  TransactionType,
  { icon: React.ReactNode; color: string; label: string }
> = {
  deposit: {
    icon: <Icons.CreditCard size={16} />,
    color: "text-emerald2",
    label: "Deposit",
  },
  withdrawal: {
    icon: <Icons.CoinOut size={16} />,
    color: "text-red-400",
    label: "Withdrawal",
  },
  task_payment: {
    icon: <Icons.Rocket size={16} />,
    color: "text-red-400",
    label: "Task Payment",
  },
  task_earning: {
    icon: <Icons.Star size={16} />,
    color: "text-emerald2",
    label: "Task Earning",
  },
  refund: {
    icon: <Icons.ArrowLeft size={16} />,
    color: "text-violet-light",
    label: "Refund",
  },
  bonus: {
    icon: <Icons.PiggyBank size={16} />,
    color: "text-amber-400",
    label: "Bonus",
  },
  earning: {
    icon: <Icons.Coins size={16} />,
    color: "text-emerald2",
    label: "Earning",
  },
};

export default function WalletPage() {
  const { user, updateWallet, accessToken } = useAuthStore();
  const { transactions, addTransaction } = useAppStore();
  const [selectedAmt, setSelectedAmt] = useState(500);
  const [customAmt, setCustomAmt] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (document.querySelector(`script[src="${PAYSTACK_SCRIPT_URL}"]`)) {
      return;
    }

    const script = document.createElement("script");
    script.src = PAYSTACK_SCRIPT_URL;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleFund = async () => {
    const amt = customAmt ? Number(customAmt) : selectedAmt;
    if (!amt || amt <= 0 || !user) {
      notify.error("Enter a valid amount");
      return;
    }

    if (!env.PAYSTACK_PUBLIC_KEY) {
      notify.error("Paystack is not configured yet.");
      return;
    }

    if (!accessToken) {
      notify.error("Your session is no longer active. Please sign in again.");
      return;
    }

    const paystack = window.PaystackPop;
    if (!paystack) {
      notify.error(
        "Payment provider is still loading. Please try again in a moment.",
      );
      return;
    }

    setIsPaying(true);

    try {
      const initializeResponse = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ amount: amt, email: user.email }),
      });

      const initPayload = (await initializeResponse
        .json()
        .catch(() => ({}))) as {
        error?: string;
        reference?: string;
        publicKey?: string;
        amount?: number;
        email?: string;
        authorizationUrl?: string;
      };

      if (!initializeResponse.ok || !initPayload.reference) {
        throw new Error(initPayload.error || "Unable to start payment.");
      }

      const handler = paystack.setup({
        key: initPayload.publicKey || env.PAYSTACK_PUBLIC_KEY,
        email: initPayload.email || user.email,
        amount: Math.round((initPayload.amount ?? amt) * 100),
        currency: "NGN",
        ref: initPayload.reference,
        callback: async (response) => {
          try {
            const verified = await cocobaseWallet.verifyDeposit(
              response.reference,
              initPayload.amount ?? amt,
              user.id,
              initPayload.amount ?? amt,
              "Wallet top-up",
            );

            if (!verified?.verified && verified?.walletBalance === undefined) {
              throw new Error("Payment could not be verified.");
            }

            const nextBalance =
              verified?.walletBalance ??
              user.walletBalance + (initPayload.amount ?? amt);
            updateWallet(nextBalance);
            addTransaction({
              type: "deposit",
              amount: initPayload.amount ?? amt,
              description: "Wallet top-up",
            });
            notify.walletFunded(initPayload.amount ?? amt);
            notify.success(
              `Payment confirmed. Reference: ${response.reference}`,
            );
            setCustomAmt("");
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Deposit verification failed.";
            notify.error(message);
          } finally {
            setIsPaying(false);
          }
        },
        onClose: () => {
          setIsPaying(false);
          notify.error("Payment cancelled");
        },
      });

      handler.openIframe();
    } catch (error) {
      setIsPaying(false);
      const message =
        error instanceof Error ? error.message : "Unable to start payment.";
      notify.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sora font-bold text-2xl mb-1">Wallet</h1>
        <p className="text-slatec text-sm">
          Manage your balance and view transaction history.
        </p>
      </div>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <div className="text-xs text-slatec uppercase tracking-wide mb-1">
            Current Balance
          </div>
          <div className="font-sora font-extrabold text-3xl sm:text-4xl text-amber-400 flex items-center gap-2">
            <Icons.Wallet size={28} className="text-amber-400" />
            {(user?.walletBalance ?? 0).toLocaleString()}
            <span className="text-base font-normal text-slatec">coins</span>
          </div>
        </div>
      </motion.div>

      {/* Fund wallet */}
      <div className="card p-5 max-w-md">
        <h2 className="font-sora font-bold text-base mb-1 flex items-center gap-2">
          <Icons.CreditCard size={16} /> Fund Wallet
        </h2>
        <p className="text-slatec text-sm mb-4">
          Choose an amount to add and pay securely with Paystack.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {FUND_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => {
                setSelectedAmt(amt);
                setCustomAmt("");
              }}
              className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all text-center ${
                selectedAmt === amt && !customAmt
                  ? "border-violet bg-violet/15 text-violet-light"
                  : "border-border text-slatec hover:border-white/20"
              }`}
            >
              {amt.toLocaleString()} coins
            </button>
          ))}
        </div>

        <input
          className="input mb-3"
          type="number"
          min={1}
          placeholder="Or enter custom amount"
          value={customAmt}
          onChange={(e) => setCustomAmt(e.target.value)}
        />

        <button
          onClick={handleFund}
          disabled={isPaying}
          className="btn-primary w-full font-sora flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Icons.CoinIn size={16} />
          {isPaying ? "Processing payment..." : "Pay with Paystack"}
        </button>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="font-sora font-bold text-base mb-3 flex items-center gap-2">
          <Icons.Clock size={16} /> Transaction History
        </h2>
        {transactions.length === 0 ? (
          <div className="card p-10 text-center text-slatec">
            <Icons.Wallet size={32} className="mx-auto mb-2 opacity-30" />
            No transactions yet
          </div>
        ) : (
          <div className="card divide-y divide-border">
            {transactions.map((tx) => {
              const meta = TX_META[tx.type];
              const isCredit = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-4 sm:px-5 py-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-navy-2 flex items-center justify-center flex-shrink-0">
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {tx.description}
                    </div>
                    <div className="text-xs text-slatec">
                      {new Date(tx.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div
                    className={`font-sora font-bold text-sm flex items-center gap-1 ${meta.color}`}
                  >
                    {isCredit ? (
                      <Icons.CoinIn size={14} />
                    ) : (
                      <Icons.CoinOut size={14} />
                    )}
                    {isCredit ? "+" : ""}
                    {tx.amount.toLocaleString()}
                    <span className="text-xs font-normal text-slatec">
                      coins
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
