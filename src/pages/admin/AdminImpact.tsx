import { useEffect, useMemo, useState } from "react";
import { cocobaseWallet } from "../../services/cocobase";
import type { Transaction } from "../../types";
import { calculateAdvertiserImpact } from "../../utils/transactionMath";

export default function AdminImpact() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    let active = true;

    const loadTransactions = async () => {
      const data = await cocobaseWallet.listTransactions();
      if (!active) return;
      setTransactions(data);
    };

    void loadTransactions();

    return () => {
      active = false;
    };
  }, []);

  const impact = useMemo(() => {
    const advertiserBudget = transactions
      .filter((tx) => tx.type === "task_payment")
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return calculateAdvertiserImpact(advertiserBudget);
  }, [transactions]);

  return (
    <div className="card p-5">
      <h2 className="font-sora font-semibold text-lg mb-4">Campaign Impact</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-slatec">Follows</p>
          <p className="mt-2 font-sora text-xl">{impact.follows}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-slatec">Likes</p>
          <p className="mt-2 font-sora text-xl">{impact.likes}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-slatec">Engagement</p>
          <p className="mt-2 font-sora text-xl">{impact.engagement}</p>
        </div>
      </div>
    </div>
  );
}
