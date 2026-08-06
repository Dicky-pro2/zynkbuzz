import { useState } from "react";
import { useGamificationStore } from "../store/gamificationStore";
import { useAuthStore } from "../store/authStore";
import { Icons } from "../components/icons/Icons";
import { motion } from "framer-motion";

type LeaderboardMetric = "earnings" | "tasks" | "streak";

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<LeaderboardMetric>("earnings");
  const {
    leaderboardEarnings,
    leaderboardTasks,
    leaderboardStreak,
    getLeaderboardPosition,
  } = useGamificationStore();
  const user = useAuthStore((s) => s.user);

  const getLeaderboard = () => {
    switch (metric) {
      case "earnings":
        return leaderboardEarnings;
      case "tasks":
        return leaderboardTasks;
      case "streak":
        return leaderboardStreak;
    }
  };

  const leaderboard = getLeaderboard();
  const userPosition = user ? getLeaderboardPosition(user.id, metric) : null;

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  const getMetricLabel = (m: LeaderboardMetric) => {
    switch (m) {
      case "earnings":
        return "Total Earnings";
      case "tasks":
        return "Tasks Completed";
      case "streak":
        return "Current Streak";
    }
  };

  const getMetricValue = (m: LeaderboardMetric, score: number) => {
    switch (m) {
      case "earnings":
        return `$${score.toFixed(2)}`;
      case "tasks":
        return `${Math.round(score)} tasks`;
      case "streak":
        return `${Math.round(score)} days`;
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-sora font-bold text-xl sm:text-2xl mb-1">
          Weekly Leaderboard
        </h1>
        <p className="text-slatec text-xs sm:text-sm">
          Compete and climb the ranks
        </p>
      </div>

      {/* Metric Tabs */}
      <div className="card p-2 flex gap-1.5 flex-wrap">
        {["earnings", "tasks", "streak"].map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m as LeaderboardMetric)}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              metric === m
                ? "bg-violet text-white"
                : "text-slatec hover:bg-bg-secondary"
            }`}
          >
            {m === "earnings" && "💰 Earnings"}
            {m === "tasks" && "✅ Tasks"}
            {m === "streak" && "🔥 Streak"}
          </button>
        ))}
      </div>

      {/* Your Rank */}
      {userPosition && user && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 sm:p-5 bg-gradient-to-r from-violet/20 to-emerald2/20 border-violet/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slatec uppercase tracking-wide font-semibold mb-1">
                Your Rank
              </div>
              <div className="text-2xl sm:text-3xl font-sora font-bold text-white">
                #{userPosition}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slatec uppercase tracking-wide font-semibold mb-1">
                {getMetricLabel(metric)}
              </div>
              <div className="text-lg sm:text-2xl font-sora font-bold text-violet-light">
                {getMetricValue(
                  metric,
                  metric === "streak"
                    ? user.currentStreak
                    : metric === "earnings"
                      ? user.walletBalance
                      : user.tasksCompleted,
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Leaderboard List */}
      <div>
        <div className="space-y-2">
          {leaderboard.length > 0 ? (
            leaderboard.slice(0, 10).map((entry, idx) => (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`card p-3 sm:p-4 flex items-center justify-between ${
                  entry.userId === user?.id
                    ? "border-violet/50"
                    : "border-border/50"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="text-lg sm:text-xl font-sora font-bold w-8 text-center flex-shrink-0">
                    {getMedalEmoji(entry.rank)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">
                      {entry.name}
                      {entry.userId === user?.id && (
                        <span className="ml-1.5 text-xs text-violet-light">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slatec">
                      Rank #{entry.rank}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="font-semibold text-sm">
                    {getMetricValue(metric, entry.score)}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="card p-6 sm:p-8 text-center text-slatec">
              <Icons.Trophy size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs sm:text-sm">
                Leaderboard will populate as users participate
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4 sm:p-5"
        >
          <div className="text-xs text-slatec uppercase tracking-wide font-semibold mb-3 flex items-center gap-1.5">
            <Icons.Trophy size={13} /> How It Works
          </div>
          <ul className="space-y-1.5 text-xs text-slatec">
            <li>📊 Resets every Monday at 12:00 UTC</li>
            <li>🎯 Top 3 get +bonus rewards</li>
            <li>⭐ Track 3 different metrics</li>
          </ul>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card p-4 sm:p-5"
        >
          <div className="text-xs text-slatec uppercase tracking-wide font-semibold mb-3 flex items-center gap-1.5">
            <Icons.Award size={13} /> Rewards
          </div>
          <ul className="space-y-1 text-xs text-slatec">
            <li>🥇 1st: +10% bonus</li>
            <li>🥈 2nd: +7% bonus</li>
            <li>🥉 3rd: +5% bonus</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
