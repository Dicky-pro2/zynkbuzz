import { create } from "zustand";
import type { ReferralData, ReferralUser } from "../types";

// Referral reward tiers
export const REFERRAL_TIERS = [
  {
    level: 1,
    bonusPercentage: 5,
    minimumReferrals: 0,
    description: "Earn 5% bonus on earnings from referrals",
  },
  {
    level: 2,
    bonusPercentage: 10,
    minimumReferrals: 3,
    description: "Earn 10% bonus + extra badge",
  },
  {
    level: 3,
    bonusPercentage: 15,
    minimumReferrals: 10,
    description: "Earn 15% bonus + premium badge",
  },
  {
    level: 4,
    bonusPercentage: 20,
    minimumReferrals: 25,
    description: "Earn 20% bonus + elite status",
  },
  {
    level: 5,
    bonusPercentage: 25,
    minimumReferrals: 50,
    description: "Earn 25% bonus + VIP status",
  },
];

interface ReferralStore {
  referralData: ReferralData | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setReferralData: (data: ReferralData) => void;
  addReferredUser: (user: ReferralUser) => void;
  generateReferralCode: (userId: string) => string;
  getReferralLevel: (totalReferrals: number) => number;
  getReferralBonus: (level: number) => number;
  clearReferralData: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useReferralStore = create<ReferralStore>((set) => ({
  referralData: null,
  isLoading: false,
  error: null,

  setReferralData: (data) => set({ referralData: data, error: null }),

  addReferredUser: (user) =>
    set((state) => {
      if (!state.referralData) return state;
      return {
        referralData: {
          ...state.referralData,
          referredUsers: [...state.referralData.referredUsers, user],
          totalReferrals: state.referralData.totalReferrals + 1,
          totalEarnings: state.referralData.totalEarnings + user.earnings,
        },
      };
    }),

  generateReferralCode: (userId: string) => {
    const code = `ZNK${userId.substring(0, 4).toUpperCase()}${Date.now().toString().slice(-4)}`;
    return code;
  },

  getReferralLevel: (totalReferrals: number) => {
    for (let i = REFERRAL_TIERS.length - 1; i >= 0; i--) {
      if (totalReferrals >= REFERRAL_TIERS[i].minimumReferrals) {
        return REFERRAL_TIERS[i].level;
      }
    }
    return 1;
  },

  getReferralBonus: (level: number) => {
    const tier = REFERRAL_TIERS.find((t) => t.level === level);
    return tier?.bonusPercentage || 5;
  },

  clearReferralData: () =>
    set({ referralData: null, error: null, isLoading: false }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),
}));
