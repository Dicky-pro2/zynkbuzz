import { useReferralStore, REFERRAL_TIERS } from "../store/referralStore";
import { useAuthStore } from "../store/authStore";
import { Icons } from "../components/icons/Icons";
import { motion } from "framer-motion";
import { useState } from "react";

export default function ReferralPage() {
  const { referralData, getReferralLevel } = useReferralStore();
  const user = useAuthStore((s) => s.user);
  const [copied, setCopied] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slatec">Please log in</p>
      </div>
    );
  }

  const referralCode =
    referralData?.code || `ZNK${user.id.substring(0, 4).toUpperCase()}`;
  const currentLevel = getReferralLevel(referralData?.totalReferrals || 0);
  const currentTier = REFERRAL_TIERS.find((t) => t.level === currentLevel);
  const nextTier =
    currentLevel < 5
      ? REFERRAL_TIERS.find((t) => t.level === currentLevel + 1)
      : null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const referralsNeeded =
    (nextTier?.minimumReferrals || 0) - (referralData?.totalReferrals || 0);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-sora font-bold text-xl sm:text-2xl mb-1">
          Referral Program
        </h1>
        <p className="text-slatec text-xs sm:text-sm">
          Earn by inviting friends to ZynkBuzz
        </p>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Referral Code */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 sm:p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slatec uppercase tracking-wide font-semibold">
              Your Code
            </span>
            <Icons.Share size={14} />
          </div>
          <div className="bg-violet/15 rounded-lg p-3 mb-3 text-center">
            <p className="font-sora font-bold text-xl text-violet-light">
              {referralCode}
            </p>
          </div>
          <button
            onClick={copyToClipboard}
            className="btn-primary w-full text-xs sm:text-sm py-1.5 flex items-center justify-center gap-1"
          >
            {copied ? (
              <>
                <Icons.Confirm size={14} /> Copied!
              </>
            ) : (
              <>
                <Icons.Copy size={14} /> Copy
              </>
            )}
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-4 sm:p-5"
        >
          <div className="text-xs text-slatec uppercase tracking-wide font-semibold mb-3">
            Referrals
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slatec mb-0.5">Total</div>
              <div className="font-sora font-bold text-lg text-violet-light">
                {referralData?.totalReferrals || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-slatec mb-0.5">Earnings</div>
              <div className="font-sora font-bold text-lg text-emerald2">
                ${(referralData?.totalEarnings || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Level */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4 sm:p-5"
        >
          <div className="text-xs text-slatec uppercase tracking-wide font-semibold mb-3">
            Current Level
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⭐</span>
            <div>
              <div className="font-sora font-bold text-lg text-white">
                Level {currentLevel}
              </div>
              <div className="text-xs text-slatec">
                {currentTier?.description}
              </div>
            </div>
          </div>
          {nextTier && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-slatec mb-1.5">
                {Math.max(0, referralsNeeded)} to next
              </div>
              <div className="w-full bg-bg-secondary rounded-full h-1.5">
                <div
                  className="bg-violet-light h-1.5 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, ((referralData?.totalReferrals || 0) / (nextTier.minimumReferrals || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Tiers */}
      <div>
        <h2 className="font-sora font-bold text-base mb-3 flex items-center gap-2">
          <Icons.Award size={15} /> Referral Tiers
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
          {REFERRAL_TIERS.map((tier, idx) => (
            <motion.div
              key={tier.level}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`card p-3 text-center ${currentLevel >= tier.level ? "border-violet/50" : "border-border/50"}`}
            >
              <div className="text-xs text-slatec uppercase font-bold mb-1">
                Lvl {tier.level}
              </div>
              <div className="text-lg font-sora font-bold text-violet-light mb-1">
                {tier.bonusPercentage}%
              </div>
              <div className="text-xs text-slatec">
                {tier.minimumReferrals}+
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Referrals List */}
      <div>
        <h2 className="font-sora font-bold text-base mb-3 flex items-center gap-2">
          <Icons.Users size={15} /> Your Referrals (
          {referralData?.totalReferrals || 0})
        </h2>
        {referralData?.referredUsers &&
        referralData.referredUsers.length > 0 ? (
          <div className="space-y-2">
            {referralData.referredUsers.map((ref) => (
              <div
                key={ref.id}
                className="card p-3 sm:p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm">{ref.name}</div>
                  <div className="text-xs text-slatec">
                    {ref.tasksCompleted} tasks
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-emerald2 text-sm">
                    ${ref.earnings.toFixed(2)}
                  </div>
                  <div className="text-xs text-slatec">
                    {new Date(ref.referredAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-6 sm:p-8 text-center text-slatec">
            <Icons.Users size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs sm:text-sm">
              No referrals yet. Share your code to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
