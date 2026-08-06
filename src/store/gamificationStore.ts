import { create } from "zustand";
import type { StreakBonus, LeaderboardEntry } from "../types";

// Streak bonus levels
export const STREAK_BONUSES: StreakBonus[] = [
  { day: 1, bonusPercentage: 0 },
  { day: 3, bonusPercentage: 5 },
  { day: 7, bonusPercentage: 10, milestone: true },
  { day: 14, bonusPercentage: 15, milestone: true },
  { day: 30, bonusPercentage: 20, milestone: true },
  { day: 60, bonusPercentage: 30, milestone: true },
  { day: 100, bonusPercentage: 50, milestone: true },
];

interface GamificationStore {
  streaks: Map<string, { current: number; longest: number; lastDate?: string }>;
  leaderboardEarnings: LeaderboardEntry[];
  leaderboardTasks: LeaderboardEntry[];
  leaderboardStreak: LeaderboardEntry[];
  isLoadingLeaderboard: boolean;

  // Streak actions
  updateStreak: (userId: string) => void;
  getStreakBonus: (days: number) => number;
  getStreakBonusData: (days: number) => StreakBonus | undefined;
  resetStreak: (userId: string) => void;

  // Leaderboard actions
  setLeaderboardEarnings: (entries: LeaderboardEntry[]) => void;
  setLeaderboardTasks: (entries: LeaderboardEntry[]) => void;
  setLeaderboardStreak: (entries: LeaderboardEntry[]) => void;
  setLeaderboardLoading: (loading: boolean) => void;
  getLeaderboardPosition: (
    userId: string,
    metric: "earnings" | "tasks" | "streak",
  ) => number | null;
}

export const useGamificationStore = create<GamificationStore>((set, get) => ({
  streaks: new Map(),
  leaderboardEarnings: [],
  leaderboardTasks: [],
  leaderboardStreak: [],
  isLoadingLeaderboard: false,

  updateStreak: (userId: string) => {
    set((state) => {
      const streaks = new Map(state.streaks);
      const today = new Date().toDateString();
      const userStreak = streaks.get(userId) || {
        current: 0,
        longest: 0,
      };

      // If last task was today, don't increment
      if (userStreak.lastDate === today) {
        return state;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      // If last task was yesterday, increment streak
      if (userStreak.lastDate === yesterdayStr) {
        userStreak.current += 1;
      } else {
        // Reset streak if it's been more than a day
        userStreak.current = 1;
      }

      // Update longest streak
      if (userStreak.current > userStreak.longest) {
        userStreak.longest = userStreak.current;
      }

      userStreak.lastDate = today;
      streaks.set(userId, userStreak);

      return { streaks };
    });
  },

  getStreakBonus: (days: number) => {
    const data = get().getStreakBonusData(days);
    return data?.bonusPercentage || 0;
  },

  getStreakBonusData: (days: number) => {
    // Find the highest applicable bonus
    for (let i = STREAK_BONUSES.length - 1; i >= 0; i--) {
      if (days >= STREAK_BONUSES[i].day) {
        return STREAK_BONUSES[i];
      }
    }
    return STREAK_BONUSES[0];
  },

  resetStreak: (userId: string) => {
    set((state) => {
      const streaks = new Map(state.streaks);
      const userStreak = streaks.get(userId);
      if (userStreak) {
        userStreak.current = 0;
        userStreak.lastDate = undefined;
        streaks.set(userId, userStreak);
      }
      return { streaks };
    });
  },

  setLeaderboardEarnings: (entries) => set({ leaderboardEarnings: entries }),

  setLeaderboardTasks: (entries) => set({ leaderboardTasks: entries }),

  setLeaderboardStreak: (entries) => set({ leaderboardStreak: entries }),

  setLeaderboardLoading: (loading) => set({ isLoadingLeaderboard: loading }),

  getLeaderboardPosition: (
    userId: string,
    metric: "earnings" | "tasks" | "streak",
  ) => {
    const state = get();
    let leaderboard: LeaderboardEntry[] = [];

    if (metric === "earnings") {
      leaderboard = state.leaderboardEarnings;
    } else if (metric === "tasks") {
      leaderboard = state.leaderboardTasks;
    } else {
      leaderboard = state.leaderboardStreak;
    }

    const position = leaderboard.findIndex((entry) => entry.userId === userId);
    return position >= 0 ? position + 1 : null;
  },
}));
