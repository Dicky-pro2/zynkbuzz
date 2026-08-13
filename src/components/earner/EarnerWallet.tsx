import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../store/authStore";
import { useAppStore } from "../../store/appStore";
import { cocobaseWallet } from "../../services/cocobase";
import { notify } from "../../utils/notify";
import { Icons } from "../icons/Icons";
import type { WithdrawalMethod, TransactionType } from "../../types";
import {
  calculateNetWithdrawal,
  calculateWithdrawalFee,
} from "../../utils/transactionMath";

const METHODS: {
  key: WithdrawalMethod;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
}[] = [
  {
    key: "bank_transfer",
    label: "Bank Transfer",
    icon: <Icons.Banknote size={18} />,
    placeholder: "Bank name, account number, account name",
  },
  {
    key: "mobile_money",
    label: "Mobile Money",
    icon: <Icons.Send size={18} />,
    placeholder: "Phone number and provider (e.g. MTN, Airtel)",
  },
  {
    key: "paypal",
    label: "PayPal",
    icon: <Icons.CreditCard size={18} />,
    placeholder: "Your PayPal email address",
  },
  {
    key: "crypto",
    label: "Crypto (USDT)",
    icon: <Icons.Globe size={18} />,
    placeholder: "Your USDT wallet address (TRC20)",
  },
];

const MIN_WITHDRAWAL = 100;

const NIGERIAN_BANKS = [
  "Access Bank",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "FCMB",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "GTBank",
  "Jaiz Bank",
  "Keystone Bank",
  "Moniepoint",
  "Opay",
  "PalmPay",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC",
  "Sterling Bank",
  "Suntrust Bank",
  "UBA",
  "Union Bank",
  "Unity Bank",
  "Wema Bank",
  "Zenith Bank",
];

const TX_META: Record<
  TransactionType,
  { icon: React.ReactNode; color: string }
> = {
  deposit: { icon: <Icons.CreditCard size={15} />, color: "text-emerald2" },
  withdrawal: { icon: <Icons.CoinOut size={15} />, color: "text-red-400" },
  task_payment: { icon: <Icons.Rocket size={15} />, color: "text-red-400" },
  task_earning: { icon: <Icons.Star size={15} />, color: "text-emerald2" },
  refund: { icon: <Icons.ArrowLeft size={15} />, color: "text-violet-light" },
  bonus: { icon: <Icons.PiggyBank size={15} />, color: "text-amber-400" },
  earning: { icon: <Icons.Coins size={15} />, color: "text-emerald2" },
};

const STATUS_DISPLAY: Record<string, { icon: React.ReactNode; color: string }> =
  {
    pending: { icon: <Icons.Clock size={14} />, color: "text-amber-400" },
    processing: { icon: <Icons.Clock size={14} />, color: "text-violet-light" },
    completed: { icon: <Icons.Approve size={14} />, color: "text-emerald2" },
    rejected: { icon: <Icons.Cancel size={14} />, color: "text-red-400" },
  };

const tabs = [
  {
    key: "withdraw" as const,
    label: "Withdraw",
    icon: <Icons.CoinOut size={14} />,
  },
  {
    key: "history" as const,
    label: "Earnings History",
    icon: <Icons.Clock size={14} />,
  },
  {
    key: "withdrawals" as const,
    label: "My Withdrawals",
    icon: <Icons.Refresh size={14} />,
  },
];

export default function EarnerWallet() {
  const { user } = useAuthStore();
  const {
    transactions,
    withdrawals,
    addWithdrawal,
    pushActivity,
    addNotification,
  } = useAppStore();

  const [method, setMethod] = useState<WithdrawalMethod>("bank_transfer");
  const [amount, setAmount] = useState("");
  const [accountDetails, setAccountDetails] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState(NIGERIAN_BANKS[0]);
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "withdraw" | "history" | "withdrawals"
  >("withdraw");

  const earningTransactions = transactions.filter(
    (tx) =>
      tx.type === "task_earning" ||
      tx.type === "withdrawal" ||
      tx.type === "bonus",
  );

  const parsedAmount = Number(amount);
  const fee = amount ? calculateWithdrawalFee(parsedAmount) : 0;
  const netAmount = amount ? calculateNetWithdrawal(parsedAmount) : 0;

  const handleWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt < MIN_WITHDRAWAL) {
      notify.error(`Minimum withdrawal is ${MIN_WITHDRAWAL} coins`);
      return;
    }
    if (!user || amt > user.walletBalance) {
      notify.error("Insufficient balance");
      return;
    }
    if (method === "bank_transfer") {
      if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
        notify.error("Please complete your bank account details");
        return;
      }
    } else if (!accountDetails.trim()) {
      notify.error("Please enter your account details");
      return;
    }

    setSubmittingWithdrawal(true);

    try {
      const methodLabel = METHODS.find((m) => m.key === method)?.label;
      const formattedAccountDetails =
        method === "bank_transfer"
          ? `Bank: ${bankName} | Account Name: ${accountName} | Account Number: ${accountNumber}`
          : accountDetails.trim();

      await cocobaseWallet.requestWithdrawal({
        userId: user.id,
        amount: amt,
        method,
        accountDetails: formattedAccountDetails,
      });

      addWithdrawal({
        amount: amt,
        method,
        accountDetails: formattedAccountDetails,
        bankName: method === "bank_transfer" ? bankName : undefined,
        accountName: method === "bank_transfer" ? accountName : undefined,
        accountNumber: method === "bank_transfer" ? accountNumber : undefined,
      });
      pushActivity(
        `Withdrawal of ${amt.toLocaleString()} coins requested`,
        "violet",
      );
      addNotification({
        type: "withdrawal_processed",
        title: "Withdrawal Requested",
        message: `Your withdrawal of ${amt.toLocaleString()} coins via ${methodLabel} is being processed.`,
      });
      notify.success(`Withdrawal of ${amt.toLocaleString()} coins submitted!`);

      setAmount("");
      setAccountDetails("");
      setAccountName("");
      setAccountNumber("");
      setBankName(NIGERIAN_BANKS[0]);
    } catch (error) {
      console.error("Failed to submit withdrawal", error);
      notify.error("Could not submit your withdrawal request right now.");
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const selectedMethod = METHODS.find((m) => m.key === method)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sora font-bold text-2xl mb-1">Wallet</h1>
        <p className="text-slatec text-sm">
          Withdraw your earnings and track transactions.
        </p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 sm:col-span-2"
        >
          <div className="text-xs text-slatec uppercase tracking-wide mb-1">
            Available to Withdraw
          </div>
          <div className="font-sora font-extrabold text-3xl sm:text-4xl text-emerald2 flex items-center gap-2">
            <Icons.Wallet size={28} className="text-emerald2" />
            {(user?.walletBalance ?? 0).toLocaleString()}
            <span className="text-base font-normal text-slatec">coins</span>
          </div>
          <div className="text-xs text-slatec mt-1 flex items-center gap-1">
            <Icons.Info size={12} />
            Minimum withdrawal: {MIN_WITHDRAWAL.toLocaleString()} coins.
            Requests are reviewed manually and posted to the backend for admin
            processing.
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-5"
        >
          <div className="text-xs text-slatec uppercase tracking-wide mb-1">
            Total Earned
          </div>
          <div className="font-sora font-extrabold text-2xl text-violet-light flex items-center gap-2">
            <Icons.Trending size={22} className="text-violet-light" />
            {(user?.totalEarned ?? 0).toLocaleString()}
            <span className="text-sm font-normal text-slatec">coins</span>
          </div>
          <div className="text-xs text-slatec mt-1">All time</div>
        </motion.div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 flex-wrap border-b border-border pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition-all border flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "border-emerald2 bg-emerald2/15 text-emerald2"
                : "border-border text-slatec hover:border-white/20"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Withdrawal form */}
        {activeTab === "withdraw" && (
          <motion.div
            key="withdraw"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="card p-5 max-w-lg space-y-4"
          >
            <h2 className="font-sora font-bold text-base flex items-center gap-2">
              <Icons.CoinOut size={16} />
              Choose Withdrawal Method
            </h2>

            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setMethod(m.key);
                    setAccountDetails("");
                  }}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition-all flex items-center gap-2 ${
                    method === m.key
                      ? "border-emerald2 bg-emerald2/10 text-emerald2"
                      : "border-border text-slatec hover:border-white/20"
                  }`}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>

            {method === "bank_transfer" ? (
              <div className="space-y-3">
                <div>
                  <label className="label">Select Bank</label>
                  <select
                    className="input"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  >
                    {NIGERIAN_BANKS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Account Name</label>
                  <input
                    className="input"
                    placeholder="e.g. John Doe"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Account Number</label>
                  <input
                    className="input"
                    placeholder="e.g. 0123456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="label">{selectedMethod.label} Details</label>
                <textarea
                  className="input min-h-[80px] resize-none"
                  placeholder={selectedMethod.placeholder}
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="label">Amount (coins)</label>
              <input
                className="input"
                type="number"
                min={MIN_WITHDRAWAL}
                max={user?.walletBalance}
                placeholder={`Min ${MIN_WITHDRAWAL}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="bg-navy-2 border border-border rounded-xl px-4 py-2.5 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slatec">Withdrawal amount</span>
                <span className="font-sora font-bold text-white">
                  {amount ? Number(amount).toLocaleString() : "0"} coins
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slatec">Platform fee (0.5%)</span>
                <span className="font-sora font-bold text-amber-400">
                  {amount ? fee.toLocaleString() : "0"} coins
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slatec">You'll receive</span>
                <span className="font-sora font-bold text-emerald2 flex items-center gap-1.5">
                  <Icons.CoinIn size={14} />
                  {amount ? netAmount.toLocaleString() : "0"} coins
                </span>
              </div>
            </div>

            <button
              onClick={() => void handleWithdraw()}
              disabled={
                submittingWithdrawal ||
                !amount ||
                Number(amount) < MIN_WITHDRAWAL ||
                Number(amount) > (user?.walletBalance ?? 0)
              }
              className="btn-green w-full font-sora disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Icons.Send size={16} />
              {submittingWithdrawal ? "Submitting..." : "Request Withdrawal"}
            </button>
          </motion.div>
        )}

        {/* Earnings history */}
        {activeTab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {earningTransactions.length === 0 ? (
              <div className="card p-10 text-center text-slatec">
                <Icons.Wallet size={32} className="mx-auto mb-3 opacity-30" />
                <p>No earnings yet — complete tasks to start earning!</p>
              </div>
            ) : (
              <div className="card divide-y divide-border">
                {earningTransactions.map((tx) => {
                  const meta = TX_META[tx.type];
                  const isCredit = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 px-4 sm:px-5 py-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-navy-2 flex items-center justify-center flex-shrink-0 text-slatec">
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
          </motion.div>
        )}

        {/* Withdrawal requests */}
        {activeTab === "withdrawals" && (
          <motion.div
            key="withdrawals"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {withdrawals.length === 0 ? (
              <div className="card p-10 text-center text-slatec">
                <Icons.Refresh size={32} className="mx-auto mb-3 opacity-30" />
                <p>No withdrawal requests yet.</p>
              </div>
            ) : (
              <div className="card divide-y divide-border">
                {withdrawals.map((w) => {
                  const statusMeta = STATUS_DISPLAY[w.status];
                  const methodMeta = METHODS.find((m) => m.key === w.method)!;
                  return (
                    <div
                      key={w.id}
                      className="flex items-center gap-3 px-4 sm:px-5 py-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-navy-2 flex items-center justify-center flex-shrink-0 text-slatec">
                        {methodMeta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {methodMeta.label}
                        </div>
                        <div className="text-xs text-slatec truncate">
                          {w.accountDetails}
                        </div>
                        <div className="text-xs text-slatec">
                          {new Date(w.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-sora font-bold text-sm text-red-400 mb-1 flex items-center justify-end gap-1">
                          <Icons.CoinOut size={13} />
                          {w.amount.toLocaleString()} coins
                        </div>
                        <div
                          className={`flex items-center justify-end gap-1 text-xs font-semibold ${statusMeta.color}`}
                        >
                          {statusMeta.icon} {w.status}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
