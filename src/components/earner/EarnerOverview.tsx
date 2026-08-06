import { useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useAppStore } from "../../store/appStore";
import StatCard from "../shared/StatCard";
import EarnTaskCard from "./EarnTaskCard";
import TaskModal from "./TaskModal";
import { Icons } from "../icons/Icons";
import type { Task } from "../../types";

export default function EarnerOverview() {
  const user = useAuthStore((s) => s.user);
  const tasks = useAppStore((s) => s.tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const availableTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status === "active" && t.slotsLeft > 0 && !t.completedByCurrentUser,
      ),
    [tasks],
  );

  const featured = useMemo(
    () => [...availableTasks].sort((a, b) => b.reward - a.reward).slice(0, 3),
    [availableTasks],
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-sora font-bold text-xl sm:text-2xl mb-1">
          Earner Dashboard
        </h1>
        <p className="text-slatec text-xs sm:text-sm">
          Complete tasks, earn coins, withdraw anytime.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          label="Earnings Balance"
          value={`${(user?.walletBalance ?? 0).toLocaleString()} coins`}
          color="green"
          icon={<Icons.Wallet size={16} />}
          delay={0}
        />
        <StatCard
          label="Tasks Completed"
          value={user?.tasksCompleted ?? 0}
          color="violet"
          icon={<Icons.Star size={16} />}
          delay={0.05}
        />
        <StatCard
          label="Available Tasks"
          value={availableTasks.length}
          color="yellow"
          icon={<Icons.Tasks size={16} />}
          delay={0.1}
        />
        <StatCard
          label="Total Earned"
          value={`${(user?.totalEarned ?? 0).toLocaleString()} coins`}
          color="green"
          icon={<Icons.Trending size={16} />}
          delay={0.15}
        />
      </div>

      {/* Featured tasks */}
      <div>
        <h2 className="font-sora font-bold text-sm sm:text-base mb-3 flex items-center gap-2">
          <Icons.Star size={15} /> Top Earning Tasks
        </h2>
        {featured.length === 0 ? (
          <div className="card p-8 sm:p-10 text-center text-slatec">
            <Icons.Tasks size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              No tasks available right now. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {featured.map((task) => (
              <EarnTaskCard
                key={task.id}
                task={task}
                onDoTask={() => setActiveTask(task)}
              />
            ))}
          </div>
        )}
      </div>

      <TaskModal task={activeTask} onClose={() => setActiveTask(null)} />
    </div>
  );
}
