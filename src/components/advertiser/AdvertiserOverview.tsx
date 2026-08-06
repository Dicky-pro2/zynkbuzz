import { useMemo } from "react";
import { useAuthStore } from "../../store/authStore";
import { useAppStore } from "../../store/appStore";
import StatCard from "../shared/StatCard";
import CreateTaskForm from "./CreateTaskForm";
import ActivityFeed from "./ActivityFeed";
import { Icons } from "../icons/Icons";

export default function AdvertiserOverview() {
  const user = useAuthStore((s) => s.user);
  const myTasks = useAppStore((s) => s.myTasks);

  const stats = useMemo(() => {
    const active = myTasks.filter((t) => t.status === "active").length;
    const completions = myTasks.reduce((sum, t) => sum + t.completionCount, 0);
    return { active, completions };
  }, [myTasks]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-sora font-bold text-xl sm:text-2xl mb-1">
          Advertiser Dashboard
        </h1>
        <p className="text-slatec text-xs sm:text-sm">
          Manage your tasks and grow your engagement.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          label="Wallet Balance"
          value={`${(user?.walletBalance ?? 0).toLocaleString()} coins`}
          color="yellow"
          icon={<Icons.Wallet size={16} />}
          delay={0}
        />
        <StatCard
          label="Active Tasks"
          value={stats.active}
          color="violet"
          icon={<Icons.Tasks size={16} />}
          delay={0.05}
        />
        <StatCard
          label="Completions"
          value={stats.completions}
          color="green"
          icon={<Icons.Approve size={16} />}
          delay={0.1}
        />
        <StatCard
          label="Coins Spent"
          value={`${(user?.totalSpent ?? 0).toLocaleString()}`}
          icon={<Icons.CoinOut size={16} />}
          delay={0.15}
        />
      </div>

      {/* Two column on large screens, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-5">
        <div>
          <h2 className="font-sora font-bold text-sm sm:text-base mb-3 flex items-center gap-2">
            <Icons.Plus size={15} /> Create New Task
          </h2>
          <CreateTaskForm />
        </div>
        <div>
          <h2 className="font-sora font-bold text-sm sm:text-base mb-3 flex items-center gap-2">
            <Icons.Trending size={15} /> Recent Activity
          </h2>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
