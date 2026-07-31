import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types";
import { useAppStore } from "./appStore";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateWallet: (newBalance: number) => void;
  updateName: (name: string) => void;
  updateAvatar: (avatar: string | null) => void;
  verifyEmail: () => void;
  recordDailyActivity: () => number;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, accessToken, refreshToken) =>
        set((state) => {
          const preserved =
            state.user && state.user.id === user.id
              ? {
                  walletBalance: state.user.walletBalance,
                  totalEarned: state.user.totalEarned,
                  totalSpent: state.user.totalSpent,
                  tasksCompleted: state.user.tasksCompleted,
                  tasksPosted: state.user.tasksPosted,
                  currentStreak: state.user.currentStreak,
                  longestStreak: state.user.longestStreak,
                  lastTaskCompletionDate: state.user.lastTaskCompletionDate,
                }
              : {};

          const nextUser = { ...user, ...preserved };

          useAppStore.getState().loadUserData(nextUser.id);

          return {
            user: nextUser,
            accessToken,
            refreshToken,
            isAuthenticated: true,
          };
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      updateWallet: (newBalance) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, walletBalance: newBalance }
            : state.user,
        })),

      updateName: (name) =>
        set((state) => ({
          user: state.user ? { ...state.user, name } : state.user,
        })),

      updateAvatar: (avatar) =>
        set((state) => ({
          user: state.user ? { ...state.user, avatar } : state.user,
        })),

      verifyEmail: () =>
        set((state) => ({
          user: state.user
            ? { ...state.user, isEmailVerified: true }
            : state.user,
        })),

      // Returns the streak count AFTER this activity is recorded, so callers
      // can immediately compute the bonus that applies to today's action.
      recordDailyActivity: () => {
        let resultStreak = 0;

        set((state) => {
          if (!state.user) return state;

          const today = new Date().toDateString();

          if (state.user.lastTaskCompletionDate === today) {
            resultStreak = state.user.currentStreak;
            return state; // already counted today, no change
          }

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const wasYesterday =
            state.user.lastTaskCompletionDate === yesterday.toDateString();

          const nextStreak = wasYesterday ? state.user.currentStreak + 1 : 1;
          const nextLongest = Math.max(state.user.longestStreak, nextStreak);
          resultStreak = nextStreak;

          return {
            user: {
              ...state.user,
              currentStreak: nextStreak,
              longestStreak: nextLongest,
              lastTaskCompletionDate: today,
            },
          };
        });

        return resultStreak;
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        useAppStore.getState().clearUserData();
      },
    }),
    {
      name: "zynk-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.user?.id) {
          useAppStore.getState().loadUserData(state.user.id);
        }
      },
    },
  ),
);
