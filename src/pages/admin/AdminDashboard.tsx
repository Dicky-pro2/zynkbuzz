import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useAppStore } from "../../store/appStore";
import { cocobaseAdmin, cocobaseWallet } from "../../services/cocobase";
import type { Transaction, Withdrawal } from "../../types";
import {
  calculateAdvertiserImpact,
  calculateWithdrawalFee,
} from "../../utils/transactionMath";

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { transactions, withdrawals } = useAppStore();
  const [cocobaseTransactions, setCocobaseTransactions] = useState<
    Transaction[]
  >([]);
  const [cocobaseWithdrawals, setCocobaseWithdrawals] = useState<Withdrawal[]>(
    [],
  );
  const [users, setUsers] = useState<
    Array<{
      id: string;
      email: string;
      name: string;
      role: string;
      createdAt: string;
      isEmailVerified: boolean;
      avatar: string | null;
      walletBalance: number;
    }>
  >([]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      const [remoteTransactions, remoteWithdrawals, remoteUsers] =
        await Promise.all([
          cocobaseWallet.listTransactions(),
          cocobaseAdmin.listWithdrawals(),
          cocobaseAdmin.listUsers(),
        ]);

      if (!active) return;
      setCocobaseTransactions(remoteTransactions);
      setCocobaseWithdrawals(remoteWithdrawals);
      setUsers(remoteUsers);
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const effectiveTransactions =
    cocobaseTransactions.length > 0 ? cocobaseTransactions : transactions;
  const effectiveWithdrawals =
    cocobaseWithdrawals.length > 0 ? cocobaseWithdrawals : withdrawals;

  const summary = useMemo(() => {
    const totalWithdrawals = effectiveWithdrawals.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const totalFees = effectiveWithdrawals.reduce(
      (sum, item) => sum + calculateWithdrawalFee(item.amount),
      0,
    );
    const totalTransactions = effectiveTransactions.reduce(
      (sum, tx) => sum + Math.abs(tx.amount),
      0,
    );
    const advertiserBudget = effectiveTransactions
      .filter((tx) => tx.type === "task_payment")
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return {
      totalWithdrawals,
      totalFees,
      totalTransactions,
      advertiserBudget,
    };
  }, [effectiveTransactions, effectiveWithdrawals]);

  if (user?.role !== "admin") {
    return (
      <div className="card p-8 text-center text-slatec">
        <p>You need admin access to view this page.</p>
      </div>
    );
  }

  const impact = calculateAdvertiserImpact(summary.advertiserBudget);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sora font-bold text-2xl mb-1">Admin Dashboard</h1>
        <p className="text-slatec text-sm">
          Monitor platform activity, withdrawal fees, and advertiser impact.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-slatec">
            Pending withdrawals
          </p>
          <p className="mt-2 font-sora text-2xl">
            {
              effectiveWithdrawals.filter((item) => item.status === "pending")
                .length
            }
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-slatec">
            Withdrawal fees
          </p>
          <p className="mt-2 font-sora text-2xl">
            {summary.totalFees.toLocaleString()} coins
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-slatec">
            Total withdrawn
          </p>
          <p className="mt-2 font-sora text-2xl">
            {summary.totalWithdrawals.toLocaleString()} coins
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-slatec">
            Advertiser budget
          </p>
          <p className="mt-2 font-sora text-2xl">
            {summary.advertiserBudget.toLocaleString()} coins
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-slatec">
            Registered users
          </p>
          <p className="mt-2 font-sora text-2xl">{users.length}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-sora font-semibold text-lg mb-4">
            Advertiser Impact
          </h2>
          <div className="space-y-3 text-sm text-slatec">
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span>Estimated follows</span>
              <span className="font-semibold text-white">{impact.follows}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span>Estimated likes</span>
              <span className="font-semibold text-white">{impact.likes}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span>Estimated engagement</span>
              <span className="font-semibold text-white">
                {impact.engagement}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-sora font-semibold text-lg mb-4">
            Recent activity
          </h2>
          <div className="space-y-2 text-sm text-slatec">
            {effectiveTransactions.slice(0, 6).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
              >
                <span>{tx.description}</span>
                <span
                  className={
                    tx.amount >= 0 ? "text-emerald2" : "text-amber-400"
                  }
                >
                  {tx.amount >= 0 ? "+" : ""}
                  {tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
            {effectiveTransactions.length === 0 && (
              <p>No activity recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
