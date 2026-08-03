import { create } from "zustand";
import type {
  Task,
  TaskSubmission,
  ActivityItem,
  Transaction,
  Withdrawal,
  Notification,
  Submission,
} from "../types";
import { useAuthStore } from "./authStore";
import { useGamificationStore } from "./gamificationStore";
import {
  cocobaseNotifications,
  cocobaseTasks,
  cocobaseWallet,
} from "../services/cocobase";

interface UserAppData {
  tasks: Task[];
  myTasks: Task[];
  activity: ActivityItem[];
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  notifications: Notification[];
  submissions: Submission[];
}

interface AppState extends UserAppData {
  currentUserId: string | null;

  loadUserData: (userId: string) => void;
  clearUserData: () => void;

  setTasks: (tasks: Task[]) => void;
  setMyTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  pushActivity: (msg: string, type?: "violet" | "green") => void;
  updateTaskStatus: (
    taskId: string,
    status: Task["status"],
  ) => Task | undefined;
  addTransaction: (tx: Omit<Transaction, "id" | "createdAt">) => void;
  completeTask: (taskId: string, proof: string) => Task | undefined;
  addWithdrawal: (w: Omit<Withdrawal, "id" | "createdAt" | "status">) => void;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (
    n: Omit<Notification, "id" | "createdAt" | "isRead">,
  ) => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  reviewTaskSubmission: (
    taskId: string,
    submissionId: string,
    action: "approve" | "reject",
    note?: string,
  ) => void;
}

const STORAGE_PREFIX = "zynk-user-data:";
const SHARED_TASKS_STORAGE_KEY = "zynk-shared-tasks";

const defaultUserData = (): UserAppData => ({
  tasks: [],
  myTasks: [],
  activity: [],
  transactions: [],
  withdrawals: [],
  submissions: [],
  notifications: [
    {
      id: crypto.randomUUID(),
      type: "welcome",
      title: "Welcome to Zynk! 🎉",
      message:
        "Your account is ready. Start exploring tasks or post your first campaign.",
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  ],
});

// ── Persistence helpers ──
function loadSharedTasks() {
  try {
    const raw = localStorage.getItem(SHARED_TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<
        Pick<UserAppData, "tasks" | "myTasks">
      >;
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        myTasks: Array.isArray(parsed.myTasks) ? parsed.myTasks : [],
      };
    }
  } catch {
    // fall through to default
  }

  return { tasks: [] as Task[], myTasks: [] as Task[] };
}

function saveSharedTasks(data: Pick<UserAppData, "tasks" | "myTasks">) {
  try {
    localStorage.setItem(SHARED_TASKS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — fail silently for demo purposes
  }
}

function loadFromStorage(userId: string): UserAppData {
  const sharedTasks = loadSharedTasks();

  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserAppData>;
      return {
        ...defaultUserData(),
        ...parsed,
        tasks: sharedTasks.tasks,
        myTasks: sharedTasks.myTasks,
      };
    }
  } catch {
    // fall through to default
  }

  return {
    ...defaultUserData(),
    tasks: sharedTasks.tasks,
    myTasks: sharedTasks.myTasks,
  };
}

function saveToStorage(userId: string | null, data: Partial<UserAppData>) {
  if (!userId) return;
  try {
    localStorage.setItem(
      STORAGE_PREFIX + userId,
      JSON.stringify({
        ...defaultUserData(),
        ...data,
        tasks: [],
        myTasks: [],
      }),
    );
  } catch {
    // localStorage full or unavailable — fail silently for demo purposes
  }
}

export const useAppStore = create<AppState>((set, get) => {
  const persistCurrent = (partial: Partial<UserAppData>) => {
    set(partial);
    const state = get();
    saveSharedTasks({ tasks: state.tasks, myTasks: state.myTasks });
    saveToStorage(state.currentUserId, {
      activity: state.activity,
      transactions: state.transactions,
      withdrawals: state.withdrawals,
      notifications: state.notifications,
      submissions: state.submissions,
    });
  };

  return {
    currentUserId: null,
    ...defaultUserData(),

    loadUserData: (userId) => {
      const data = loadFromStorage(userId);
      set({ currentUserId: userId, ...data });

      void Promise.all([
        cocobaseWallet.listTransactions(userId),
        cocobaseWallet.listWithdrawals(userId),
        cocobaseNotifications.list(userId),
      ])
        .then(([transactions, withdrawals, notifications]) => {
          const nextTransactions =
            transactions.length > 0 ? transactions : data.transactions;
          const nextWithdrawals =
            withdrawals.length > 0 ? withdrawals : data.withdrawals;
          const nextNotifications =
            notifications.length > 0 ? notifications : data.notifications;

          set((state) => ({
            ...state,
            transactions: nextTransactions,
            withdrawals: nextWithdrawals,
            notifications: nextNotifications,
          }));

          saveToStorage(userId, {
            transactions: nextTransactions,
            withdrawals: nextWithdrawals,
            notifications: nextNotifications,
          });
        })
        .catch((error) => {
          console.warn("Failed to hydrate wallet data from Cocobase", error);
        });
    },

    clearUserData: () => {
      const state = get();
      set({
        currentUserId: null,
        ...defaultUserData(),
        tasks: state.tasks,
        myTasks: state.myTasks,
      });
    },

    setTasks: (tasks) => persistCurrent({ tasks }),
    setMyTasks: (tasks) => persistCurrent({ myTasks: tasks }),

    addTask: (task) => {
      const state = get();
      persistCurrent({
        myTasks: [task, ...state.myTasks],
        tasks: [task, ...state.tasks],
      });
    },

    pushActivity: (msg, type = "violet") => {
      const state = get();
      persistCurrent({
        activity: [
          {
            id: crypto.randomUUID(),
            msg,
            type,
            time: new Date().toLocaleTimeString(),
          },
          ...state.activity,
        ].slice(0, 20),
      });
    },

    updateTaskStatus: (taskId, status) => {
      const state = get();
      let updatedTask: Task | undefined;

      const update = (list: Task[]) =>
        list.map((t) => {
          if (t.id !== taskId) return t;
          updatedTask = { ...t, status };
          return updatedTask;
        });

      persistCurrent({
        myTasks: update(state.myTasks),
        tasks: update(state.tasks),
      });

      return updatedTask;
    },

    addTransaction: (tx) => {
      const state = get();
      const nextTransaction = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...tx,
      };

      persistCurrent({
        transactions: [nextTransaction, ...state.transactions],
      });

      const userId = useAuthStore.getState().user?.id ?? state.currentUserId;
      if (userId) {
        void cocobaseWallet
          .createTransaction({
            userId,
            type: nextTransaction.type,
            amount: nextTransaction.amount,
            description: nextTransaction.description,
            createdAt: nextTransaction.createdAt,
          })
          .catch((error) => {
            console.warn("Failed to sync transaction to Cocobase", error);
          });
      }
    },

    completeTask: (taskId, proof) => {
      const state = get();
      let updatedTask: Task | undefined;
      const task = state.tasks.find((t) => t.id === taskId);
      const authUser = useAuthStore.getState().user;

      const newTaskSubmission: TaskSubmission = {
        id: crypto.randomUUID(),
        earnerName: authUser?.name ?? "Current Earner",
        earnerId: authUser?.id ?? "earner_current",
        proof,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      // Reserve the slot immediately so it can't be double-claimed while
      // pending review; refunded automatically if the advertiser rejects it.
      const update = (list: Task[]) =>
        list.map((t) => {
          if (t.id !== taskId) return t;
          const slotsLeft = Math.max(0, t.slotsLeft - 1);
          updatedTask = {
            ...t,
            slotsLeft,
            status: slotsLeft <= 0 ? "completed" : t.status,
            completedByCurrentUser: true,
            taskSubmissions: [...(t.taskSubmissions ?? []), newTaskSubmission],
          };
          return updatedTask;
        });

      const newSubmission: Submission = {
        id: newTaskSubmission.id,
        taskId,
        taskTitle: task
          ? `${task.taskType} on ${task.platform}`
          : "Unknown Task",
        platform: task?.platform ?? "",
        taskType: task?.taskType ?? "",
        reward: task?.reward ?? 0,
        proof,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      persistCurrent({
        tasks: update(state.tasks),
        myTasks: update(state.myTasks),
        submissions: [newSubmission, ...state.submissions],
      });

      // Sync the slot reservation to Cocobase so other earners see it too.
      if (updatedTask) {
        void cocobaseTasks
          .update(taskId, {
            slotsLeft: updatedTask.slotsLeft,
            status: updatedTask.status,
          })
          .catch((error) => {
            console.warn("Failed to sync task slot reservation", error);
          });
      }

      return updatedTask;
    },

    setNotifications: (notifications) => persistCurrent({ notifications }),

    addWithdrawal: (w) => {
      const state = get();

      const authState = useAuthStore.getState();
      if (authState.user && authState.user.walletBalance < w.amount) {
        throw new Error("Insufficient balance for this withdrawal.");
      }

      persistCurrent({
        withdrawals: [
          {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            status: "pending",
            ...w,
          },
          ...state.withdrawals,
        ],
      });

      // Debit immediately — funds are locked while the withdrawal is pending.
      // The authoritative balance change is persisted by the server-side mutation endpoint.
      if (authState.user) {
        authState.updateWallet(authState.user.walletBalance - w.amount);
      }
      get().addTransaction({
        type: "withdrawal",
        amount: -w.amount,
        description: `Withdrawal via ${w.method}`,
      });
    },

    addNotification: (n) => {
      const state = get();
      const nextNotification = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        isRead: false,
        ...n,
      };

      persistCurrent({
        notifications: [nextNotification, ...state.notifications],
      });

      const userId = useAuthStore.getState().user?.id ?? state.currentUserId;
      if (userId) {
        void cocobaseNotifications
          .create({
            userId,
            type: nextNotification.type,
            title: nextNotification.title,
            message: nextNotification.message,
            isRead: nextNotification.isRead,
            createdAt: nextNotification.createdAt,
          })
          .catch((error) => {
            console.warn("Failed to sync notification to Cocobase", error);
          });
      }
    },

    markAllNotificationsRead: () => {
      const state = get();
      persistCurrent({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      });
    },

    markNotificationRead: (id) => {
      const state = get();
      persistCurrent({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
      });
    },

    reviewTaskSubmission: (taskId, submissionId, action, note) => {
      const state = get();
      const task = state.tasks.find((t) => t.id === taskId);
      const submissionEntry = task?.taskSubmissions?.find(
        (s) => s.id === submissionId,
      );

      const update = (list: Task[]) =>
        list.map((t) => {
          if (t.id !== taskId) return t;
          const updatedSubmissions = (t.taskSubmissions ?? []).map((s) => {
            if (s.id !== submissionId) return s;
            return {
              ...s,
              status:
                action === "approve"
                  ? ("approved" as const)
                  : ("rejected" as const),
              reviewNote: note,
            };
          });
          const slotsLeft = action === "reject" ? t.slotsLeft + 1 : t.slotsLeft;
          return {
            ...t,
            taskSubmissions: updatedSubmissions,
            slotsLeft,
            completionCount:
              action === "approve" ? t.completionCount + 1 : t.completionCount,
          };
        });

      const updatedTasks = update(state.tasks);
      const updatedMyTasks = update(state.myTasks);
      const updatedTask = updatedTasks.find((t) => t.id === taskId);

      persistCurrent({
        tasks: updatedTasks,
        myTasks: updatedMyTasks,
        submissions: state.submissions.map((s) =>
          s.id === submissionId
            ? { ...s, status: action === "approve" ? "approved" : "rejected" }
            : s,
        ),
      });

      if (updatedTask) {
        void cocobaseTasks
          .update(taskId, {
            slotsLeft: updatedTask.slotsLeft,
            completionCount: updatedTask.completionCount,
          })
          .catch((error) => {
            console.warn("Failed to sync task review counts", error);
          });
      }

      // Server-authoritative payout flow: approval hits the backend, which
      // resolves the earner by id and credits their balance on record.
      if (action === "approve" && submissionEntry && task?.reward) {
        const authState = useAuthStore.getState();
        if (authState.user && authState.user.id === submissionEntry.earnerId) {
          const newStreak = authState.recordDailyActivity();
          const bonusPercent = useGamificationStore
            .getState()
            .getStreakBonus(newStreak);
          const bonusAmount =
            Math.round(task.reward * (bonusPercent / 100) * 100) / 100;

          authState.updateWallet(
            authState.user.walletBalance + task.reward + bonusAmount,
          );

          get().addTransaction({
            type: "task_earning",
            amount: task.reward,
            description: `Approved: ${task.taskType} on ${task.platform}`,
          });

          if (bonusAmount > 0) {
            get().addTransaction({
              type: "bonus",
              amount: bonusAmount,
              description: `${bonusPercent}% streak bonus (Day ${newStreak})`,
            });
          }
        }
      }
    },
  };
});
