import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icons } from "../icons/Icons";
import { useAuthStore } from "../../store/authStore";
import { useAppStore } from "../../store/appStore";
import { cocobaseSubmissions } from "../../services/cocobase";
import { notify } from "../../utils/notify";
import type { Task } from "../../types";

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
}

export default function TaskModal({ task, onClose }: TaskModalProps) {
  const { user } = useAuthStore();
  const { completeTask, pushActivity, addNotification } =
    useAppStore();
  const [proof, setProof] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!proof.trim()) {
      notify.error(
        "Please provide proof (your profile URL or screenshot link)",
      );
      return;
    }
    if (!task || !user) return;

    setSubmitting(true);

    try {
      await cocobaseSubmissions.submit({
        taskId: task.id,
        taskTitle: `${task.taskType} on ${task.platform}`,
        platform: task.platform,
        taskType: task.taskType,
        reward: task.reward,
        proof: proof.trim(),
      });

      completeTask(task.id, proof);
      pushActivity(
        `Submitted for review: ${task.taskType} on ${task.platform}`,
        "violet",
      );
      addNotification({
        type: "task_completed",
        title: "Submission Received",
        message: `Your proof for "${task.taskType} on ${task.platform}" is pending advertiser review.`,
      });

      notify.success(
        "Submitted! You'll be paid once the advertiser approves it.",
      );
      setProof("");
      onClose();
    } catch (error) {
      console.error("Failed to submit task proof", error);
      notify.error("Could not submit your proof right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {task && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className="card p-5 sm:p-6 w-full max-w-md relative mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slatec hover:text-white transition-colors"
            >
              <Icons.Close size={20} />
            </button>

            <h2 className="font-sora font-bold text-xl mb-1">
              {task.taskType} on {task.platform}
            </h2>
            <p className="text-slatec text-sm mb-4">
              Earn{" "}
              <span className="text-emerald2 font-semibold">
                🪙{task.reward}
              </span>{" "}
              for completing this task
            </p>

            <div className="bg-navy-2 border border-border rounded-xl p-4 mb-4 text-sm text-slatec leading-relaxed">
              {task.instructions}
              <br />

              <a
                href={task.url}
                target="_blank"
                rel="noreferrer"
                className="text-violet-light break-all hover:underline"
              >
                {task.url}
              </a>
            </div>

            <label className="label">
              Paste your profile URL / screenshot link as proof
            </label>
            <input
              className="input mb-4"
              placeholder="https://instagram.com/yourhandle"
              value={proof}
              onChange={(e) => setProof(e.target.value)}
            />

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="btn-green flex-1 flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Icons.Confirm size={16} />{" "}
                {submitting ? "Submitting..." : "Submit & Earn"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
