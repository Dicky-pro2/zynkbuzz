export type Role = "advertiser" | "earner" | "admin";

export interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  nickname?: string | null;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  role: Role;
  avatar: string | null;
  walletBalance: number;
  totalEarned: number;
  totalSpent: number;
  tasksCompleted: number;
  tasksPosted: number;
  isEmailVerified: boolean;
  taskQualityScore: number;
  currentStreak: number;
  longestStreak: number;
  lastTaskCompletionDate?: string;
  referralCode?: string;
  referralsCount: number;
  referralEarnings: number;
  referralLevel: number;
  theme: "light" | "dark";
}

export interface ActivityItem {
  id: string;
  msg: string;
  type: "violet" | "green";
  time: string;
}

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "task_payment"
  | "task_earning"
  | "refund"
  | "bonus"
  | "earning";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // positive = credit, negative = debit
  description: string;
  createdAt: string;
}

export interface Task {
  id: string;
  advertiser: string;
  advertiserName: string;
  advertiserId?: string;
  advertiserEmail?: string;
  advertiserDisplayName?: string;
  platform: string;
  taskType: string;
  title: string;
  instructions: string;
  url: string;
  reward: number;
  totalSlots: number;
  slotsLeft: number;
  completionCount: number;
  status: "active" | "paused" | "completed" | "cancelled";
  createdAt: string;
  completedByCurrentUser?: boolean;
  taskSubmissions?: TaskSubmission[];
  // New analytics fields
  minQualityScore?: number; // minimum quality score required to see this task
  totalClicks?: number; // for analytics
  costPerTask?: number; // for analytics
}

export type WithdrawalMethod =
  | "bank_transfer"
  | "paypal"
  | "crypto"
  | "mobile_money";

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "completed"
  | "rejected";

export interface Withdrawal {
  id: string;
  amount: number;
  method: WithdrawalMethod;
  accountDetails: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  status: WithdrawalStatus;
  createdAt: string;
}

export type NotificationType =
  | "task_completed"
  | "task_approved"
  | "task_rejected"
  | "deposit_success"
  | "withdrawal_processed"
  | "new_task"
  | "welcome";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Submission {
  id: string;
  taskId: string;
  taskTitle: string;
  platform: string;
  taskType: string;
  reward: number;
  proof: string;
  status: "approved" | "pending" | "rejected";
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  earnerName: string;
  earnerId: string;
  proof: string;
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  createdAt: string;
}

// New types for features
export interface ReferralReward {
  level: number;
  bonusPercentage: number;
  minimumReferrals: number;
  description: string;
}

export interface ReferralUser {
  id: string;
  name: string;
  email: string;
  tasksCompleted: number;
  referredAt: string;
  earnings: number;
}

export interface ReferralData {
  code: string;
  level: number;
  totalReferrals: number;
  totalEarnings: number;
  referredUsers: ReferralUser[];
}

export interface StreakBonus {
  day: number;
  bonusPercentage: number;
  milestone?: boolean; // true if this is a special milestone day (7, 14, 30, etc)
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  score: number; // Can be total earned, tasks completed, or streak
  metric: string; // "earnings", "tasks_completed", "streak"
}

export interface AdvertiserAnalytics {
  advertiserId: string;
  totalTasksPosted: number;
  totalCompletions: number;
  completionRate: number; // percentage
  totalClicks: number;
  totalCostPerTask: number;
  averageCostPerCompletion: number;
  totalSpent: number;
  tasksData: TaskAnalyticsData[];
}

export interface TaskAnalyticsData {
  taskId: string;
  title: string;
  posted: string;
  completions: number;
  clicks: number;
  costPerTask: number;
  status: Task["status"];
}
