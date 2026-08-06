import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "../../store/appStore";
import { Icons } from "../icons/Icons";
import { PlatformIcon } from "../icons/PlatformIcons";

type StatusFilter = "all" | "approved" | "pending" | "rejected";

const STATUS_STYLES: Record<string, string> = {
  approved: "badge-green",
  pending: "badge-yellow",
  rejected: "badge-red",
};

const STATUS_ICONS: Record<string, string> = {
  approved: "✅",
  pending: "⏳",
  rejected: "❌",
};

export default function EarnerSubmissions() {
  const submissions = useAppStore((s) => s.submissions);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return submissions;
    return submissions.filter((s) => s.status === filter);
  }, [submissions, filter]);

  const totalEarned = useMemo(
    () =>
      submissions
        .filter((s) => s.status === "approved")
        .reduce((sum, s) => sum + s.reward, 0),
    [submissions],
  );

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "approved", label: "✅ Approved" },
    { key: "pending", label: "⏳ Pending" },
    { key: "rejected", label: "❌ Rejected" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-sora font-bold text-2xl mb-1">My Submissions</h1>
        <p className="text-slatec text-sm">All tasks you have completed.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card"
        >
          <div className="text-xs text-slatec uppercase tracking-wide mb-1">
            Total Submissions
          </div>
          <div className="font-sora font-bold text-2xl text-violet-light">
            {submissions.length}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="stat-card"
        >
          <div className="text-xs text-slatec uppercase tracking-wide mb-1">
            Approved
          </div>
          <div className="font-sora font-bold text-2xl text-emerald2">
            {submissions.filter((s) => s.status === "approved").length}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card col-span-2 sm:col-span-1"
        >
          <div className="text-xs text-slatec uppercase tracking-wide mb-1">
            Total Earned
          </div>
          <div className="font-sora font-bold text-2xl text-amber-400">
            🪙 {totalEarned.toLocaleString()}
          </div>
        </motion.div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-xl border px-4 py-1.5 text-sm font-semibold transition-all ${
              filter === f.key
                ? "border-emerald2 bg-emerald2/15 text-emerald2"
                : "border-border text-slatec hover:border-white/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Submissions list */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-slatec">
          <div className="text-3xl mb-2">📋</div>
          {submissions.length === 0
            ? "No submissions yet — complete tasks to see them here!"
            : "No submissions match this filter."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card p-3 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-navy-2 flex items-center justify-center flex-shrink-0">
                  <PlatformIcon platform={sub.platform} size={18} />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-xs sm:text-sm">
                      {sub.taskTitle}
                    </span>
                    <span className={STATUS_STYLES[sub.status]}>
                      {STATUS_ICONS[sub.status]} {sub.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge-yellow flex items-center gap-1 text-xs">
                      <Icons.Wallet size={10} /> {sub.reward} coins
                    </span>
                    <span className="text-xs text-slatec">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="bg-navy-2 rounded-lg px-2.5 py-1.5 text-xs flex items-start gap-2">
                    <span className="text-slatec flex-shrink-0">Proof:</span>
                    <span className="break-all text-slatec/80">
                      {sub.proof}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
