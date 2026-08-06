import { create } from "zustand";
import type { AdvertiserAnalytics } from "../types";

interface QualityScoreStore {
  // Quality score calculations
  userQualityScores: Map<string, number>; // userId -> quality score (0-100)
  qualityHistory: Map<string, { date: string; score: number }[]>; // userId -> history

  // Task visibility filters
  filteredTasks: Map<string, number>; // userId -> minQualityScore threshold

  // Analytics data
  advertiserAnalytics: Map<string, AdvertiserAnalytics>; // advertiserId -> analytics

  // Actions
  updateQualityScore: (userId: string, newScore: number) => void;
  calculateQualityScore: (
    approvedTasks: number,
    rejectedTasks: number,
    totalTasks: number,
  ) => number;
  getVisibleTasks: (userQualityScore: number) => number; // returns minQualityScore threshold
  recordQualityScoreHistory: (userId: string, score: number) => void;
  getQualityScoreHistory: (
    userId: string,
  ) => { date: string; score: number }[] | null;

  // Analytics actions
  setAdvertiserAnalytics: (analytics: AdvertiserAnalytics) => void;
  updateAnalytics: (
    advertiserId: string,
    updates: Partial<AdvertiserAnalytics>,
  ) => void;
  getAdvertiserAnalytics: (advertiserId: string) => AdvertiserAnalytics | null;
  recordTaskClick: (advertiserId: string, taskId: string) => void;
  recordTaskCompletion: (
    advertiserId: string,
    taskId: string,
    costPerTask: number,
  ) => void;
}

export const useQualityScoreStore = create<QualityScoreStore>((set, get) => ({
  userQualityScores: new Map(),
  qualityHistory: new Map(),
  filteredTasks: new Map(),
  advertiserAnalytics: new Map(),

  updateQualityScore: (userId: string, newScore: number) => {
    set((state) => {
      const scores = new Map(state.userQualityScores);
      // Cap score between 0 and 100
      const cappedScore = Math.max(0, Math.min(100, newScore));
      scores.set(userId, cappedScore);
      return { userQualityScores: scores };
    });
    get().recordQualityScoreHistory(userId, newScore);
  },

  calculateQualityScore: (
    approvedTasks: number,
    rejectedTasks: number,
    totalTasks: number,
  ) => {
    if (totalTasks === 0) return 100; // New users get perfect score

    const approvalRate = (approvedTasks / totalTasks) * 100;
    const penaltyPerRejection = (rejectedTasks / totalTasks) * 10;

    // Base score on approval rate, with penalty for rejections
    let score = approvalRate - penaltyPerRejection;
    score = Math.max(0, Math.min(100, score)); // Cap at 0-100

    return Math.round(score);
  },

  getVisibleTasks: (userQualityScore: number) => {
    // Tasks with no minimum score requirement
    if (userQualityScore < 40) return 0;
    if (userQualityScore < 60) return 40;
    if (userQualityScore < 80) return 60;
    return 80; // Can see all tasks with score >= 80
  },

  recordQualityScoreHistory: (userId: string, score: number) => {
    set((state) => {
      const history = new Map(state.qualityHistory);
      const userHistory = history.get(userId) || [];
      userHistory.push({
        date: new Date().toISOString(),
        score: Math.round(score),
      });
      // Keep only last 30 entries
      if (userHistory.length > 30) {
        userHistory.shift();
      }
      history.set(userId, userHistory);
      return { qualityHistory: history };
    });
  },

  getQualityScoreHistory: (userId: string) => {
    return get().qualityHistory.get(userId) || null;
  },

  setAdvertiserAnalytics: (analytics: AdvertiserAnalytics) => {
    set((state) => {
      const analyticsMap = new Map(state.advertiserAnalytics);
      analyticsMap.set(analytics.advertiserId, analytics);
      return { advertiserAnalytics: analyticsMap };
    });
  },

  updateAnalytics: (
    advertiserId: string,
    updates: Partial<AdvertiserAnalytics>,
  ) => {
    set((state) => {
      const analyticsMap = new Map(state.advertiserAnalytics);
      const current = analyticsMap.get(advertiserId);
      if (current) {
        analyticsMap.set(advertiserId, { ...current, ...updates });
      }
      return { advertiserAnalytics: analyticsMap };
    });
  },

  getAdvertiserAnalytics: (advertiserId: string) => {
    return get().advertiserAnalytics.get(advertiserId) || null;
  },

  recordTaskClick: (advertiserId: string, taskId: string) => {
    set((state) => {
      const analyticsMap = new Map(state.advertiserAnalytics);
      const current = analyticsMap.get(advertiserId);
      if (current) {
        current.totalClicks += 1;
        const taskData = current.tasksData.find((t) => t.taskId === taskId);
        if (taskData) {
          taskData.clicks += 1;
        }
      }
      return { advertiserAnalytics: analyticsMap };
    });
  },

  recordTaskCompletion: (
    advertiserId: string,
    taskId: string,
    costPerTask: number,
  ) => {
    set((state) => {
      const analyticsMap = new Map(state.advertiserAnalytics);
      const current = analyticsMap.get(advertiserId);
      if (current) {
        current.totalCompletions += 1;
        current.totalSpent += costPerTask;
        current.completionRate =
          (current.totalCompletions / current.totalTasksPosted) * 100;
        current.averageCostPerCompletion =
          current.totalSpent / current.totalCompletions;

        const taskData = current.tasksData.find((t) => t.taskId === taskId);
        if (taskData) {
          taskData.completions += 1;
          taskData.costPerTask = costPerTask;
        }
      }
      return { advertiserAnalytics: analyticsMap };
    });
  },
}));
