import { useEffect, useState } from "react";
import { cocobaseAdmin } from "../../services/cocobase";
import type { Withdrawal } from "../../types";

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadWithdrawals = async () => {
      const data = await cocobaseAdmin.listWithdrawals();
      if (!active) return;
      setWithdrawals(data);
    };

    void loadWithdrawals();

    return () => {
      active = false;
    };
  }, []);

  const handleStatusChange = async (
    withdrawalId: string,
    status: Withdrawal["status"],
  ) => {
    setIsUpdating(withdrawalId);
    const updated = await cocobaseAdmin.updateWithdrawalStatus(
      withdrawalId,
      status,
    );
    if (updated) {
      setWithdrawals((current) =>
        current.map((item) => (item.id === withdrawalId ? updated : item)),
      );
    }
    setIsUpdating(null);
  };

  return (
    <div className="card p-5">
      <h2 className="font-sora font-semibold text-lg mb-4">
        Withdrawal Requests
      </h2>
      <div className="space-y-2">
        {withdrawals.length === 0 && (
          <p className="text-sm text-slatec">No withdrawal requests yet.</p>
        )}
        {withdrawals.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-xl border border-border px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">
                {item.amount.toLocaleString()} coins
              </p>
              <p className="text-slatec">
                {item.method} • {item.accountDetails}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-400">
                {item.status}
              </span>
              {item.status === "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      void handleStatusChange(item.id, "completed")
                    }
                    disabled={isUpdating === item.id}
                    className="rounded-lg border border-emerald2/30 px-2.5 py-1 text-xs font-semibold text-emerald2 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(item.id, "rejected")}
                    disabled={isUpdating === item.id}
                    className="rounded-lg border border-red-400/30 px-2.5 py-1 text-xs font-semibold text-red-400 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
