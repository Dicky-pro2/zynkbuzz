import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Icons } from "../components/icons/Icons";
import { cocobaseAuth } from "../services/cocobase";
import { notify } from "../utils/notify";
import { AuthShell, LoadingSpinner } from "./Login";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!password) errs.password = "Password is required";
    else if (!passwordRegex.test(password)) {
      errs.password = "Use 8+ chars with upper, lower, number and symbol";
    }
    if (!confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      notify.error("This reset link is invalid or incomplete.");
      return;
    }

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await cocobaseAuth.resetPassword(token, password);
      setDone(true);
      notify.success("Password reset successfully!");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Unable to reset password",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell>
        <div className="text-center py-4 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto">
            <Icons.Cancel size={24} className="text-red-400" />
          </div>
          <h2 className="font-sora font-bold text-xl">Invalid Reset Link</h2>
          <p className="text-slatec text-sm leading-relaxed">
            This password reset link is missing or invalid. Please request a
            new one.
          </p>
          <Link
            to="/forgot-password"
            className="btn-primary w-full font-sora flex items-center justify-center gap-2 mt-2"
          >
            <Icons.Mail size={16} /> Request New Link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Link
        to="/login"
        className="flex items-center gap-1.5 text-slatec hover:text-white text-sm mb-6 transition-colors"
      >
        <Icons.ArrowLeft size={16} /> Back to login
      </Link>

      {done ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-4 space-y-3"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald2/15 flex items-center justify-center mx-auto">
            <Icons.Verified size={24} className="text-emerald2" />
          </div>
          <h2 className="font-sora font-bold text-xl">Password Reset</h2>
          <p className="text-slatec text-sm leading-relaxed">
            Your password has been changed. You can now log in with your new
            password.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="btn-primary w-full font-sora flex items-center justify-center gap-2 mt-2"
          >
            <Icons.ArrowRight size={16} /> Go to Login
          </button>
        </motion.div>
      ) : (
        <>
          <h1 className="font-sora font-bold text-2xl mb-1">
            Set a New Password
          </h1>
          <p className="text-slatec text-sm mb-6">
            Choose a strong new password for your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <Icons.Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slatec pointer-events-none"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  className="input pl-10 pr-10"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slatec hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <Icons.EyeOff size={16} />
                  ) : (
                    <Icons.Eye size={16} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <Icons.Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slatec pointer-events-none"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  className="input pl-10"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full font-sora flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner /> Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}