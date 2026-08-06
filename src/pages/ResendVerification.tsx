import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Icons } from "../components/icons/Icons";
import { useAuthStore } from "../store/authStore";
import { notify } from "../utils/notify";
import { cocobaseAuth } from "../services/cocobase";
import { AuthShell, LoadingSpinner } from "./Login";

export default function ResendVerification() {
  const { user } = useAuthStore();
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      notify.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await cocobaseAuth.requestEmailVerification();
      setSent(true);
      notify.success("Verification link sent to your inbox.");
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : "Unable to send verification email",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Link
        to={user ? "/dashboard" : "/login"}
        className="flex items-center gap-1.5 text-slatec hover:text-white text-sm mb-6 transition-colors"
      >
        <Icons.ArrowLeft size={16} />
        {user ? "Back to Dashboard" : "Back to Login"}
      </Link>

      {sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-4 space-y-3"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald2/15 flex items-center justify-center mx-auto">
            <Icons.Mail size={24} className="text-emerald2" />
          </div>
          <h2 className="font-sora font-bold text-xl">Check your inbox</h2>
          <p className="text-slatec text-sm leading-relaxed">
            We sent a new verification link to{" "}
            <strong className="text-white">{email}</strong>.
          </p>
          <div className="pt-2">
            <p className="text-xs text-slatec mb-3">Didn't receive it?</p>
            <button
              onClick={() => setSent(false)}
              className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
            >
              <Icons.Refresh size={14} /> Try Again
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-violet/15 flex items-center justify-center mb-4">
            <Icons.Mail size={24} className="text-violet-light" />
          </div>
          <h1 className="font-sora font-bold text-2xl mb-1">
            Resend Verification
          </h1>
          <p className="text-slatec text-sm mb-6 leading-relaxed">
            Enter your email address and we'll send you a new verification link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Icons.Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slatec pointer-events-none"
                />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full font-sora flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner /> Sending...
                </>
              ) : (
                <>
                  <Icons.Send size={16} /> Send Verification Link
                </>
              )}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
