import { useState, useMemo } from "react";
import { useAuthStore } from "../../store/authStore";
import { useAppStore } from "../../store/appStore";
import AdvertiserTaskCard from "./AdvertiserTaskCard";
import { Icons } from "../icons/Icons";
import { notify } from "../../utils/notify";
import type { Task } from "../../types";
import { cocobaseTasks } from "../../services/cocobase";

type FilterType = "all" | "active" | "paused" | "completed" | "cancelled";

const filters: {
  key: FilterType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "all", label: "All Tasks", icon: <Icons.Tasks size={13} /> },
  { key: "active", label: "Active", icon: <Icons.Play size={13} /> },
  { key: "paused", label: "Paused", icon: <Icons.Pause size={13} /> },
  { key: "completed", label: "Completed", icon: <Icons.Approve size={13} /> },
  { key: "cancelled", label: "Cancelled", icon: <Icons.Cancel size={13} /> },
];

export default function AdvertiserTasks() {
  const { user, updateWallet } = useAuthStore();
  const {
    myTasks,
    updateTaskStatus,
    pushActivity,
    addTransaction,
    addNotification,
  } = useAppStore();
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredTasks = useMemo(() => {
    if (filter === "all") return myTasks;
    return myTasks.filter((t) => t.status === filter);
  }, [myTasks, filter]);

  const counts = useMemo(
    () => ({
      all: myTasks.length,
      active: myTasks.filter((t) => t.status === "active").length,
      paused: myTasks.filter((t) => t.status === "paused").length,
      completed: myTasks.filter((t) => t.status === "completed").length,
      cancelled: myTasks.filter((t) => t.status === "cancelled").length,
    }),
    [myTasks],
  );

  const handleUpdateStatus = (taskId: string, status: Task["status"]) => {
    const task = myTasks.find((t) => t.id === taskId);
    if (!task || !user) return;

    if (status === "cancelled" && task.status !== "cancelled") {
      const refund = task.slotsLeft * task.reward;
      if (refund > 0) {
        // Server-side wallet reconciliation is handled by the backend mutation endpoint.
        updateWallet(user.walletBalance + refund);
        pushActivity(
          `Task cancelled — ${refund.toLocaleString()} coins refunded`,
          "green",
        );
        addTransaction({
          type: "refund",
          amount: refund,
          description: `Refund for cancelled task: ${task.taskType} on ${task.platform}`,
        });
        addNotification({
          type: "task_approved",
          title: "Task Cancelled",
          message: `Your task was cancelled. ${refund.toLocaleString()} coins have been refunded.`,
        });
        notify.success(
          `Task cancelled. ${refund.toLocaleString()} coins refunded to your wallet.`,
        );
      }
    } else if (status === "paused") {
      notify.info("Task paused — no new submissions will be accepted.");
      pushActivity(
        `Task paused: ${task.taskType} on ${task.platform}`,
        "violet",
      );
    } else if (status === "active" && task.status === "paused") {
      notify.success("Task resumed!");
      pushActivity(
        `Task resumed: ${task.taskType} on ${task.platform}`,
        "violet",
      );
    }

    updateTaskStatus(taskId, status);

    void cocobaseTasks.update(taskId, { status }).catch((error) => {
      console.warn("Failed to sync task status to Cocobase", error);
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-sora font-bold text-2xl mb-1">My Tasks</h1>
        <p className="text-slatec text-sm">Manage tasks you've posted.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-xl border px-4 py-1.5 text-sm font-semibold transition-all flex items-center gap-1.5 ${
              filter === f.key
                ? "border-violet bg-violet/15 text-violet-light"
                : "border-border text-slatec hover:border-white/20"
            }`}
          >
            {f.icon}
            {f.label}
            <span
              className={`text-xs rounded-full px-1.5 py-0.5 font-normal ${
                filter === f.key
                  ? "bg-violet/20 text-violet-light"
                  : "bg-border text-slatec"
              }`}
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="card p-10 text-center text-slatec">
          <Icons.Tasks size={32} className="mx-auto mb-3 opacity-30" />
          <p>
            {myTasks.length === 0
              ? "No tasks yet. Create your first task from the Overview tab!"
              : "No tasks match this filter."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredTasks.map((task) => (
            <AdvertiserTaskCard
              key={task.id}
              task={task}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
