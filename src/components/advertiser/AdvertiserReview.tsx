import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icons } from "../icons/Icons";
import { useAppStore } from "../../store/appStore";
import { cocobaseSubmissions } from "../../services/cocobase";
import { notify } from "../../utils/notify";
import { PlatformIcon } from "../icons/PlatformIcons";
//import type { TaskSubmission } from '../../types';

type StatusFilter = "all" | "approved" | "pending" | "rejected";

const STATUS_STYLES: Record<string, string> = {
  approved: "badge-green",
  pending: "badge-yellow",
  rejected: "badge-red",
};

export default function AdvertiserReview() {
  const { myTasks, reviewTaskSubmission, pushActivity } = useAppStore();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [rejectModal, setRejectModal] = useState<{
    taskId: string;
    submissionId: string;
  } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const allSubmissions = useMemo(() => {
    return myTasks
      .flatMap((task) =>
        (task.taskSubmissions ?? []).map((sub) => ({ ...sub, task })),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [myTasks]);

  const filtered = useMemo(() => {
    if (filter === "all") return allSubmissions;
    return allSubmissions.filter((s) => s.status === filter);
  }, [allSubmissions, filter]);

  const pendingCount = allSubmissions.filter(
    (s) => s.status === "pending",
  ).length;

  const handleApprove = async (
    taskId: string,
    submissionId: string,
    reward: number,
  ) => {
    setProcessingId(submissionId);
    try {
      await cocobaseSubmissions.review({
        taskId,
        submissionId,
        action: "approve",
      });
      reviewTaskSubmission(taskId, submissionId, "approve");
      pushActivity(`Submission approved · 🪙${reward} paid to earner`, "green");
      notify.success(`Submission approved! 🪙${reward} paid to earner.`);
    } catch (error) {
      console.error("Failed to approve submission", error);
      notify.error("Could not update the submission right now.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessingId(rejectModal.submissionId);
    try {
      await cocobaseSubmissions.review({
        taskId: rejectModal.taskId,
        submissionId: rejectModal.submissionId,
        action: "reject",
        note: rejectNote.trim() || undefined,
      });
      reviewTaskSubmission(
        rejectModal.taskId,
        rejectModal.submissionId,
        "reject",
        rejectNote,
      );
      pushActivity("Submission rejected — slot refunded", "violet");
      notify.info("Submission rejected. Slot refunded to the task.");
      setRejectModal(null);
      setRejectNote("");
    } catch (error) {
      console.error("Failed to reject submission", error);
      notify.error("Could not reject the submission right now.");
    } finally {
      setProcessingId(null);
    }
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: `All (${allSubmissions.length})` },
    { key: "pending", label: `⏳ Pending (${pendingCount})` },
    { key: "approved", label: "✅ Approved" },
    { key: "rejected", label: "❌ Rejected" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-sora font-bold text-2xl mb-1">
          Submissions Review
        </h1>
        <p className="text-slatec text-sm">
          Review proof submitted by earners on your tasks.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card">
          <div className="text-xs text-slatec uppercase tracking-wide mb-1">
            Total
          </div>
          <div className="font-sora font-bold text-2xl text-violet-light">
            {allSubmissions.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slatec uppercase tracking-wide mb-1">
            Pending
          </div>
          <div className="font-sora font-bold text-2xl text-amber-400">
            {pendingCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slatec uppercase tracking-wide mb-1">
            Approved
          </div>
          <div className="font-sora font-bold text-2xl text-emerald2">
            {allSubmissions.filter((s) => s.status === "approved").length}
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-xl border px-4 py-1.5 text-sm font-semibold transition-all ${
              filter === f.key
                ? "border-violet bg-violet/15 text-violet-light"
                : "border-border text-slatec hover:border-white/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-slatec">
          <div className="text-3xl mb-2">📭</div>
          {allSubmissions.length === 0
            ? "No submissions yet. Earners will appear here after completing your tasks."
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
              className="card p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy-2 flex items-center justify-center text-lg flex-shrink-0">
                  <PlatformIcon platform={sub.task.platform} size={22} />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm">
                      {sub.task.taskType} on {sub.task.platform}
                    </span>
                    <span className={STATUS_STYLES[sub.status]}>
                      {sub.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-xs text-slatec">
                    <span>👤 {sub.earnerName}</span>
                    <span className="badge-yellow">🪙 {sub.task.reward}</span>
                    <span>{new Date(sub.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="bg-navy-2 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                    <span className="text-slatec">Proof:</span>
                    <span className="text-violet-light break-all flex-1">
                      {sub.proof}
                    </span>

                    <a
                      href={
                        sub.proof.startsWith("http")
                          ? sub.proof
                          : `https://${sub.proof}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-slatec hover:text-white transition-colors flex-shrink-0"
                    >
                      <Icons.ExternalLink size={13} />
                    </a>
                  </div>

                  {sub.reviewNote && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
                      Note: {sub.reviewNote}
                    </div>
                  )}

                  {sub.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() =>
                          void handleApprove(
                            sub.task.id,
                            sub.id,
                            sub.task.reward,
                          )
                        }
                        disabled={processingId === sub.id}
                        className="flex items-center gap-1.5 bg-emerald2/15 border border-emerald2/30 text-emerald2 hover:bg-emerald2/25 rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Icons.Approve size={14} />{" "}
                        {processingId === sub.id ? "Processing..." : "Approve"}
                      </button>
                      <button
                        onClick={() =>
                          setRejectModal({
                            taskId: sub.task.id,
                            submissionId: sub.id,
                          })
                        }
                        disabled={processingId === sub.id}
                        className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Icons.Cancel size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {rejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={() => setRejectModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-6 w-full max-w-md"
            >
              <h2 className="font-sora font-bold text-lg mb-1">
                Reject Submission
              </h2>
              <p className="text-slatec text-sm mb-4">
                The slot will be refunded back to the task. Optionally leave a
                note.
              </p>
              <label className="label">Rejection Note (optional)</label>
              <textarea
                className="input min-h-[80px] resize-none mb-4"
                placeholder="e.g. Proof does not match the task requirements..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectModal(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleReject()}
                  disabled={Boolean(processingId)}
                  className="flex-1 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 rounded-xl py-3 font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {processingId ? "Submitting..." : "Confirm Reject"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
