import { Flame, Target, } from "lucide-react";
import {
  useGamificationStore,
} from "../store/gamificationStore";
import { useQualityScoreStore } from "../store/qualityScoreStore";
import { useAuthStore } from "../store/authStore";

export default function GamificationWidget() {
  const user = useAuthStore((s) => s.user);
  const { getStreakBonus, getStreakBonusData } = useGamificationStore();
  const { userQualityScores } = useQualityScoreStore();

  if (!user || user.role !== "earner") {
    return null;
  }

  const qualityScore = userQualityScores.get(user.id) || 100;
  const streakBonus = getStreakBonus(user.currentStreak);
  const streakData = getStreakBonusData(user.currentStreak);

  const getQualityScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getQualityScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/20";
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/20";
    if (score >= 40) return "bg-orange-100 dark:bg-orange-900/20";
    return "bg-red-100 dark:bg-red-900/20";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Streak Card */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-orange-900 dark:text-orange-200">
            Your Streak
          </h3>
          <Flame className="w-6 h-6 text-orange-600" />
        </div>

        <div className="mb-4">
          <p className="text-4xl font-bold text-orange-600 mb-2">
            {user.currentStreak} days
          </p>
          <p className="text-sm text-orange-700 dark:text-orange-300">
            Longest: {user.longestStreak} days
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Daily Bonus
            </span>
            <span className="text-lg font-bold text-orange-600">
              +{streakBonus}%
            </span>
          </div>
          {streakData?.milestone && (
            <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold">
              🏆 Milestone Bonus Active!
            </p>
          )}
        </div>

        <p className="text-sm text-orange-700 dark:text-orange-300">
          Complete a task today to maintain your streak!
        </p>
      </div>

      {/* Quality Score Card */}
      <div
        className={`border-2 rounded-lg p-6 ${getQualityScoreBg(qualityScore)} ${
          qualityScore >= 80
            ? "border-green-300 dark:border-green-700"
            : qualityScore >= 60
              ? "border-yellow-300 dark:border-yellow-700"
              : qualityScore >= 40
                ? "border-orange-300 dark:border-orange-700"
                : "border-red-300 dark:border-red-700"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Quality Score
          </h3>
          <Target className={`w-6 h-6 ${getQualityScoreColor(qualityScore)}`} />
        </div>

        <div className="mb-4">
          <p
            className={`text-4xl font-bold ${getQualityScoreColor(qualityScore)} mb-2`}
          >
            {qualityScore}/100
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {qualityScore >= 80
              ? "Excellent - See all premium tasks"
              : qualityScore >= 60
                ? "Good - Standard task visibility"
                : qualityScore >= 40
                  ? "Fair - Limited task visibility"
                  : "Poor - Complete more tasks to improve"}
          </p>
        </div>

        <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full transition-all ${
              qualityScore >= 80
                ? "bg-green-600"
                : qualityScore >= 60
                  ? "bg-yellow-600"
                  : qualityScore >= 40
                    ? "bg-orange-600"
                    : "bg-red-600"
            }`}
            style={{ width: `${qualityScore}%` }}
          />
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400">
          Score is based on task completion and approval rates
        </p>
      </div>
    </div>
  );
}
