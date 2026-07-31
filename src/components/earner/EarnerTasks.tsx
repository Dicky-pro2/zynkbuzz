import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../store/appStore";
import { cocobaseTasks } from "../../services/cocobase";
import EarnTaskCard from "./EarnTaskCard";
import TaskModal from "./TaskModal";
import { Icons } from "../icons/Icons";
import { PlatformIcon } from "../icons/PlatformIcons";
import { useAuthStore } from "../../store/authStore";
import type { Task } from "../../types";

type PlatformFilter = "all" | string;
type TypeFilter = "all" | string;

const PLATFORM_OPTIONS = [
  "Instagram",
  "Twitter/X",
  "TikTok",
  "YouTube",
  "Facebook",
  "LinkedIn",
] as const;
const TASK_TYPE_OPTIONS = [
  "Follow",
  "Like",
  "Comment",
  "Share",
  "Subscribe",
  "View",
] as const;

export default function EarnerTasks() {
  // Purpose: keep the earner browse view backed by the latest live task feed.
  const setTasks = useAppStore((s) => s.setTasks);
  const user = useAuthStore((s) => s.user);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [taskFeed, setTaskFeed] = useState<Task[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Purpose: fetch the newest task list from the live source when the page opens or when the user refreshes.
  const refreshTasks = useCallback(async () => {
    setIsRefreshing(true);
    setLoadError(null);

    try {
      const freshTasks = await cocobaseTasks.list();
      const normalizedTasks = freshTasks.filter(
        (task) => task.status === "active" && task.slotsLeft > 0,
      );

      setTaskFeed(normalizedTasks);
      setTasks(freshTasks);
    } catch (error) {
      console.error("Unable to refresh earner tasks", error);
      setLoadError(
        "We could not load fresh tasks right now. Please try again.",
      );
      setTaskFeed([]);
      setTasks([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [setTasks]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await refreshTasks();
      } catch {
        if (!active) {
          // ignore stale refreshes once the component unmounts
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [refreshTasks]);

  const userQualityScore = user?.taskQualityScore ?? 100;

  // Purpose: only show tasks that are still open for the current earner and meet their quality threshold.
  const availableTasks = useMemo(
    () =>
      taskFeed.filter(
        (task) =>
          task.status === "active" &&
          task.slotsLeft > 0 &&
          !task.completedByCurrentUser &&
          (task.minQualityScore ?? 0) <= userQualityScore,
      ),
    [taskFeed, userQualityScore],
  );

  const hiddenByQuality = useMemo(
    () =>
      taskFeed.filter(
        (task) =>
          task.status === "active" &&
          task.slotsLeft > 0 &&
          !task.completedByCurrentUser &&
          (task.minQualityScore ?? 0) > userQualityScore,
      ),
    [taskFeed, userQualityScore],
  );

  const filteredTasks = useMemo(() => {
    return availableTasks.filter((task) => {
      if (platformFilter !== "all" && task.platform !== platformFilter)
        return false;
      if (typeFilter !== "all" && task.taskType !== typeFilter) return false;
      return true;
    });
  }, [availableTasks, platformFilter, typeFilter]);

  const showPlaceholder =
    !isRefreshing &&
    !loadError &&
    filteredTasks.length === 0 &&
    availableTasks.length === 0 &&
    hiddenByQuality.length === 0;
  const showQualityGateMessage =
    !isRefreshing &&
    !loadError &&
    filteredTasks.length === 0 &&
    hiddenByQuality.length > 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-sora font-bold text-xl sm:text-2xl mb-1">
            Browse Tasks
          </h1>
          <p className="text-slatec text-xs sm:text-sm">
            Complete tasks to earn coins instantly.
          </p>
        </div>

        <button
          onClick={() => void refreshTasks()}
          disabled={isRefreshing}
          className="btn-green text-xs px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <Icons.Refresh
            size={13}
            className={isRefreshing ? "animate-spin" : ""}
          />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Platform filter — horizontal scroll on mobile */}
      <div>
        <div className="text-xs text-slatec uppercase tracking-wide mb-2 font-medium flex items-center gap-1.5">
          <Icons.Globe size={12} /> Platform
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <FilterChip
            active={platformFilter === "all"}
            onClick={() => setPlatformFilter("all")}
          >
            All
          </FilterChip>
          {PLATFORM_OPTIONS.map((platform) => (
            <FilterChip
              key={platform}
              active={platformFilter === platform}
              onClick={() => setPlatformFilter(platform)}
            >
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <PlatformIcon platform={platform} size={13} />
                {platform}
              </span>
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Task type filter */}
      <div>
        <div className="text-xs text-slatec uppercase tracking-wide mb-2 font-medium flex items-center gap-1.5">
          <Icons.Tasks size={12} /> Task Type
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <FilterChip
            active={typeFilter === "all"}
            onClick={() => setTypeFilter("all")}
          >
            All Types
          </FilterChip>
          {TASK_TYPE_OPTIONS.map((taskType) => (
            <FilterChip
              key={taskType}
              active={typeFilter === taskType}
              onClick={() => setTypeFilter(taskType)}
            >
              <span className="whitespace-nowrap">{taskType}</span>
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-slatec flex items-center gap-1.5">
        <Icons.Tasks size={12} />
        {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}{" "}
        available
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {loadError}
        </div>
      ) : null}

      {/* Purpose: show a friendly empty state when the live task feed has no open work right now. */}
      {showQualityGateMessage ? (
        <div className="card border-dashed border-border/70 p-8 sm:p-10 text-center text-slatec">
          <Icons.Star size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-white">
            Your quality score is blocking some tasks.
          </p>
          <p className="mt-1 text-xs sm:text-sm">
            You currently have a quality score of {userQualityScore}. Complete
            more approved tasks to unlock higher-tier opportunities.
          </p>
        </div>
      ) : showPlaceholder ? (
        <div className="card border-dashed border-border/70 p-8 sm:p-10 text-center text-slatec">
          <Icons.Tasks size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-white">
            No tasks are available right now.
          </p>
          <p className="mt-1 text-xs sm:text-sm">
            Refresh the list to look for new opportunities or check back soon.
          </p>
          <button
            onClick={() => void refreshTasks()}
            disabled={isRefreshing}
            className="mt-4 btn-green text-xs px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRefreshing ? "Refreshing…" : "Check for new tasks"}
          </button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="card p-8 sm:p-10 text-center text-slatec">
          <Icons.Tasks size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No tasks match these filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredTasks.map((task) => (
            <EarnTaskCard
              key={task.id}
              task={task}
              onDoTask={() => setActiveTask(task)}
            />
          ))}
        </div>
      )}

      <TaskModal task={activeTask} onClose={() => setActiveTask(null)} />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
        active
          ? "border-emerald2 bg-emerald2/15 text-emerald2"
          : "border-border text-slatec hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}
