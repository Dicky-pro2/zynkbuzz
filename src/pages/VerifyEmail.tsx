import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Icons } from "../components/icons/Icons";
import { useAuthStore } from "../store/authStore";
import { useAppStore } from "../store/appStore";
import { notify } from "../utils/notify";
import { cocobaseAuth, isCocobaseEnabled } from "../services/cocobase";

type Status =
  | "verifying"
  | "success"
  | "already_verified"
  | "warning"
  | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, verifyEmail } = useAuthStore();
  const { addNotification } = useAppStore();
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    const verify = async () => {
      setErrorMessage(null);

      // If already verified, no need to go further
      if (user?.isEmailVerified) {
        setStatus("already_verified");
        return;
      }

      // No token in URL
      if (!token || token.trim().length < 8) {
        setStatus("warning");
        return;
      }

      try {
        if (!isCocobaseEnabled) {
          throw new Error("Verification service is unavailable");
        }

        await cocobaseAuth.verifyEmail(token);
        verifyEmail();
        addNotification({
          type: "welcome",
          title: "Email Verified!",
          message:
            "Your email has been verified successfully. Your account is now fully active.",
        });
        setStatus("success");
      } catch (error) {
        console.error("Email verification failed", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "We could not verify your email with the current link. Please request a fresh one.",
        );
        setStatus("error");
      }
    };

    verify();
  }, [addNotification, token, user?.isEmailVerified, verifyEmail]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute w-[500px] h-[500px] bg-violet/15 rounded-full blur-[100px] -top-32 -left-32 pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -bottom-24 -right-24 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8 w-full max-w-md relative z-10 text-center"
      >
        {/* Logo */}
        <Link
          to="/"
          className="font-sora font-extrabold text-xl inline-block mb-8"
        >
          Zynk<span className="text-violet-light">Buzz</span>
        </Link>

        {/* Verifying state */}
        {status === "verifying" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-violet/15 flex items-center justify-center mx-auto">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Icons.Refresh size={28} className="text-violet-light" />
              </motion.div>
            </div>
            <h1 className="font-sora font-bold text-xl">
              Verifying your email...
            </h1>
            <p className="text-slatec text-sm">Please wait a moment.</p>
          </motion.div>
        )}

        {/* Success state */}
        {status === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="w-16 h-16 rounded-2xl bg-emerald2/15 flex items-center justify-center mx-auto"
            >
              <Icons.Verified size={28} className="text-emerald2" />
            </motion.div>
            <h1 className="font-sora font-bold text-xl">Email Verified!</h1>
            <p className="text-slatec text-sm leading-relaxed">
              Your email has been verified successfully. Your account is now
              fully active.
            </p>
            <div className="pt-2 space-y-2">
              {user ? (
                <button
                  onClick={() => {
                    notify.success("Email verified! Welcome aboard.");
                    navigate("/dashboard");
                  }}
                  className="btn-green w-full font-sora flex items-center justify-center gap-2"
                >
                  <Icons.Dashboard size={16} />
                  Go to Dashboard
                </button>
              ) : (
                <Link
                  to="/login"
                  className="btn-primary w-full font-sora flex items-center justify-center gap-2"
                >
                  <Icons.ArrowRight size={16} />
                  Log In to Continue
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* Already verified state */}
        {status === "already_verified" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-violet/15 flex items-center justify-center mx-auto">
              <Icons.Verified size={28} className="text-violet-light" />
            </div>
            <h1 className="font-sora font-bold text-xl">Already Verified</h1>
            <p className="text-slatec text-sm leading-relaxed">
              Your email is already verified. You're all set!
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="btn-primary w-full font-sora flex items-center justify-center gap-2"
            >
              <Icons.Dashboard size={16} />
              Go to Dashboard
            </button>
          </motion.div>
        )}

        {/* Warning state */}
        {status === "warning" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto">
              <Icons.Cancel size={28} className="text-amber-400" />
            </div>
            <h1 className="font-sora font-bold text-xl">
              Verification Link Warning
            </h1>
            <p className="text-slatec text-sm leading-relaxed">
              This verification link looks incomplete or invalid. Please copy
              the full link from your email or request a fresh one.
            </p>
            <div className="pt-2 space-y-2">
              <button
                onClick={() => navigate("/resend-verification")}
                className="btn-primary w-full font-sora flex items-center justify-center gap-2"
              >
                <Icons.Mail size={16} />
                Resend Verification Email
              </button>
              <Link
                to={user ? "/dashboard" : "/login"}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              >
                <Icons.ArrowLeft size={14} />
                {user ? "Back to Dashboard" : "Back to Login"}
              </Link>
            </div>
          </motion.div>
        )}

        {/* Error state */}
        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto">
              <Icons.Cancel size={28} className="text-red-400" />
            </div>
            <h1 className="font-sora font-bold text-xl">Verification Failed</h1>
            <p className="text-slatec text-sm leading-relaxed">
              {errorMessage ||
                "This verification link is invalid or has expired. Please request a new one."}
            </p>
            <div className="pt-2 space-y-2">
              <button
                onClick={() => navigate("/resend-verification")}
                className="btn-primary w-full font-sora flex items-center justify-center gap-2"
              >
                <Icons.Mail size={16} />
                Resend Verification Email
              </button>
              <Link
                to={user ? "/dashboard" : "/login"}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              >
                <Icons.ArrowLeft size={14} />
                {user ? "Back to Dashboard" : "Back to Login"}
              </Link>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
