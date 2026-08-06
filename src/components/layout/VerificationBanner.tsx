import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Icons } from "../icons/Icons";
import { notify } from "../../utils/notify";

export default function VerificationBanner() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    notify.success("Verification email sent! Check your inbox.");
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
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleResend}
                disabled={sending}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1 disabled:opacity-60"
              >
                {sending ? (
                  <>
                    <Icons.Refresh size={11} className="animate-spin" />{" "}
                    Sending...
                  </>
                ) : (
                  <>
                    <Icons.Send size={11} /> Resend
                  </>
                )}
              </button>
              <button
                onClick={() =>
                  navigate("/verify-email?token=demo_verification_token")
                }
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
