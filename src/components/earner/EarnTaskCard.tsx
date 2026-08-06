import { motion } from "framer-motion";
import { Icons } from "../icons/Icons";
import type { Task } from "../../types";
import { PlatformIcon } from "../icons/PlatformIcons";

interface EarnTaskCardProps {
  task: Task;
  onDoTask: () => void;
}

export default function EarnTaskCard({ task, onDoTask }: EarnTaskCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="card p-5 transition-all hover:border-emerald2/40"
    >
      <div className="flex items-start justify-between mb-3">
        {/* Reward */}
        <div className="font-sora font-extrabold text-2xl text-emerald2 flex items-center gap-1.5">
          <Icons.Wallet size={20} className="text-emerald2" />
          {task.reward}
          <span className="text-xs text-slatec font-normal font-inter">
            coins
          </span>
        </div>

        {/* Platform */}
        <div className="flex items-center gap-1.5 text-sm text-slatec">
          <PlatformIcon platform={task.platform} size={15} className="opacity-80" />
          {task.platform}
        </div>
      </div>

      {/* Task description */}
      <p className="text-sm mb-2">
        <strong>{task.taskType}</strong> · {task.instructions}
      </p>

      {/* URL */}
      <a
        href={task.url}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-violet-light break-all hover:underline flex items-center gap-1"
      >
        <Icons.ExternalLink size={11} />
        {task.url}
      </a>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <span className="text-xs text-slatec flex items-center gap-1.5">
          <Icons.User size={12} />
          {task.slotsLeft} slots left
        </span>
        <button
          onClick={onDoTask}
          disabled={task.slotsLeft <= 0}
          className="btn-green text-xs px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <Icons.Confirm size={13} />
          Do Task
        </button>
      </div>
    </motion.div>
  );
}