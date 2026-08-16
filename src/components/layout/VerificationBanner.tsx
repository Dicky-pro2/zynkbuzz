import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Icons } from "../icons/Icons";
import { notify } from "../../utils/notify";
import { useAuthStore } from "../../store/authStore";
import { cocobaseAuth } from "../../services/cocobase";

const RESEND_COOLDOWN_MS = 45_000;

export default function VerificationBanner() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return;

    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= cooldownUntil) {
        setCooldownUntil(null);
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  if (user?.isEmailVerified) {
    return null;
  }

  const cooldownActive = Boolean(
    cooldownUntil && now !== null && now < cooldownUntil,
  );
  const remainingSeconds =
    cooldownUntil && now !== null
      ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
      : 0;

  const handleResend = async () => {
    if (!user) {
      navigate("/resend-verification");
      return;
    }

    if (cooldownActive) {
      return;
    }

    setSending(true);
    setError(null);
    try {
      await cocobaseAuth.requestEmailVerification();
      setSuccess(true);
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS);
      setNow(Date.now());
      notify.success("Verification email sent! Check your inbox.");
      window.setTimeout(() => setSuccess(false), 2500);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to send verification email.";
      setError(message);
      notify.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-amber-500/10 border-b border-amber-500/20"
        >
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Icons.Warning
                size={14}
                className="text-amber-400 flex-shrink-0"
              />
              <span className="text-amber-200 leading-snug">
                Your email is not verified.{" "}
                <span className="text-slatec">
                  Verify to unlock all features.
                </span>
              </span>
              {success && (
                <span className="text-emerald-300">
                  Verification email sent!
                </span>
              )}
              {remainingSeconds > 0 && (
                <span className="text-amber-200">
                  Resend available in {remainingSeconds}s.
                </span>
              )}
              {error && <span className="text-red-300">{error}</span>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleResend}
                disabled={sending || cooldownActive}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1 disabled:opacity-60"
              >
                {sending ? (
                  <>
                    <Icons.Refresh size={11} className="animate-spin" />{" "}
                    Sending...
                  </>
                ) : remainingSeconds > 0 ? (
                  <>
                    <Icons.Refresh size={11} /> Resend in {remainingSeconds}s
                  </>
                ) : (
                  <>
                    <Icons.Send size={11} /> Resend
                  </>
                )}
              </button>
              <button
                onClick={() => navigate("/resend-verification")}
                className="text-xs font-semibold text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1"
              >
                <Icons.Verified size={11} /> Verify Now
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="text-slatec hover:text-white transition-colors p-0.5"
              >
                <Icons.Close size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
