import { useState } from "react";
import { useAppStore } from "../store/appStore";
import { Icons } from "../components/icons/Icons";
import { motion } from "framer-motion";
import type { WithdrawalStatus } from "../types";

type FilterStatus = WithdrawalStatus | "all";

export default function WithdrawalHistoryPage() {
  const withdrawals = useAppStore((s) => s.withdrawals);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const filteredWithdrawals =
    filterStatus === "all"
      ? withdrawals
      : withdrawals.filter((w) => w.status === filterStatus);

  const totalWithdrawn = withdrawals
    .filter((w) => w.status === "completed")
    .reduce((sum, w) => sum + w.amount, 0);

  const pendingAmount = withdrawals
    .filter((w) => w.status === "pending" || w.status === "processing")
    .reduce((sum, w) => sum + w.amount, 0);

  const getStatusColor = (status: WithdrawalStatus) => {
    switch (status) {
      case "completed":
        return "bg-emerald2/15 text-emerald2";
      case "pending":
      case "processing":
        return "bg-amber-400/15 text-amber-400";
      case "rejected":
        return "bg-red-500/15 text-red-400";
    }
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: "Bank Transfer",
      paypal: "PayPal",
      crypto: "Cryptocurrency",
      mobile_money: "Mobile Money",
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-sora font-bold text-xl sm:text-2xl mb-1">
          Withdrawal History
        </h1>
        <p className="text-slatec text-xs sm:text-sm">Track your withdrawals</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 sm:p-5"
        >
          <div className="text-xs text-slatec uppercase tracking-wide font-semibold mb-2">
            Total Withdrawn
          </div>
          <div className="font-sora font-bold text-xl sm:text-2xl text-emerald2">
            ${totalWithdrawn.toFixed(2)}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-4 sm:p-5"
        >
          <div className="text-xs text-slatec uppercase tracking-wide font-semibold mb-2">
            Pending
          </div>
          <div className="font-sora font-bold text-xl sm:text-2xl text-amber-400">
            ${pendingAmount.toFixed(2)}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4 sm:p-5"
        >
          <div className="text-xs text-slatec uppercase tracking-wide font-semibold mb-2">
            Total Requests
          </div>
          <div className="font-sora font-bold text-xl sm:text-2xl text-violet-light">
            {withdrawals.length}
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="card p-2 flex gap-1.5 flex-wrap">
        {["all", "completed", "pending", "rejected"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as FilterStatus)}
            className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === status
                ? "bg-violet text-white"
                : "text-slatec hover:bg-bg-secondary"
            }`}
          >
            {status === "all" && "All"}
            {status === "completed" && "Completed"}
            {status === "pending" && "Pending"}
            {status === "rejected" && "Rejected"}
          </button>
        ))}
      </div>

      {/* Withdrawals List */}
      <div>
        {filteredWithdrawals.length > 0 ? (
          <div className="space-y-2">
            {filteredWithdrawals.map((w, idx) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="card p-3 sm:p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm mb-1">
                      ${w.amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-slatec mb-2">
                      {getMethodLabel(w.method)}
                    </div>
                    <div className="text-xs text-slatec">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 capitalize ${getStatusColor(
                      w.status,
                    )}`}
                  >
                    {w.status}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="card p-6 sm:p-8 text-center text-slatec">
            <Icons.CoinOut size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs sm:text-sm">No withdrawals found</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="card p-4 sm:p-5 bg-amber-400/10 border-amber-400/30">
        <div className="text-xs text-amber-400 uppercase tracking-wide font-semibold mb-2 flex items-center gap-1.5">
          <Icons.Info size={13} /> Info
        </div>
        <ul className="space-y-1 text-xs text-slatec">
          <li>✓ Processing time: 3-5 business days</li>
          <li>✓ Minimum: $5 | Maximum: $5000</li>
          <li>✓ Verify your payment method first</li>
        </ul>
      </div>
    </div>
  );
}
