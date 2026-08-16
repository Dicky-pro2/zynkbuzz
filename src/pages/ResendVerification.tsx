import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Icons } from "../components/icons/Icons";
import { useAuthStore } from "../store/authStore";
import { notify } from "../utils/notify";
import { cocobaseAuth } from "../services/cocobase";
import { AuthShell, LoadingSpinner } from "./Login";

const RESEND_COOLDOWN_MS = 45_000;

export default function ResendVerification() {
  const { user } = useAuthStore();
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
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

  const cooldownActive = Boolean(
    cooldownUntil && now !== null && now < cooldownUntil,
  );
  const remainingSeconds =
    cooldownUntil && now !== null
      ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
      : 0;

  const activeEmail = user?.email ?? email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user && !email.trim()) {
      notify.error("Please enter your email");
      return;
    }

    if (cooldownActive) {
      return;
    }

    setLoading(true);
    try {
      if (user) {
        await cocobaseAuth.requestEmailVerification();
      } else {
        const response = await fetch("/api/auth/resend-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload.error || "Unable to send verification email.",
          );
        }
      }

      setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS);
      setNow(Date.now());
      setSent(true);
      notify.success("Verification email sent! Check your inbox.");
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
            <strong className="text-white">{activeEmail}</strong>.
          </p>
          {remainingSeconds > 0 && (
            <p className="text-xs text-amber-300">
              Resend available in {remainingSeconds} seconds.
            </p>
          )}
          <div className="pt-2">
            <p className="text-xs text-slatec mb-3">Didn't receive it?</p>
            <button
              onClick={() => setSent(false)}
              disabled={cooldownActive}
              className="btn-secondary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Icons.Refresh size={14} />
              {remainingSeconds > 0 ? `Wait ${remainingSeconds}s` : "Try Again"}
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
            {user
              ? "We'll send the verification email to your account email."
              : "Enter the email address you used to create your ZynkBuzz account."}
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
                  value={activeEmail}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={Boolean(user)}
                  disabled={Boolean(user)}
                  aria-readonly={Boolean(user)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || cooldownActive}
              className="btn-primary w-full font-sora flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoadingSpinner /> Sending...
                </>
              ) : remainingSeconds > 0 ? (
                <>
                  <Icons.Clock size={16} /> Resend available in{" "}
                  {remainingSeconds}s
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
