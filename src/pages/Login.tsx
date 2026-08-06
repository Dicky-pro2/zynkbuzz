import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Icons } from "../components/icons/Icons";
import { useAuthStore } from "../store/authStore";
import { cocobaseAuth } from "../services/cocobase";
import { signInWithGoogle } from "../services/googleAuth";
import { notify } from "../utils/notify";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      errs.email = "Enter a valid email";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 6) errs.password = "Minimum 6 characters";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const result = await cocobaseAuth.login(form.email, form.password);
      if (!result.user) throw new Error("Unable to sign in");
      login(
        result.user,
        result.token ?? "backend_token",
        result.refreshToken ?? "backend_refresh",
      );
      notify.success(`Welcome back, ${result.user.name}!`);
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed";
      setErrors((prev) => ({ ...prev, password: message }));
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { credential } = await signInWithGoogle();
      const result = await cocobaseAuth.googleLogin(credential, "earner");
      if (!result.user) throw new Error("Unable to sign in");

      login(
        result.user,
        result.token ?? "backend_token",
        result.refreshToken ?? "backend_refresh",
      );
      notify.success(`Welcome back, ${result.user.name}!`);
      navigate("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Google sign-in failed";
      setErrors((prev) => ({ ...prev, password: message }));
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="font-sora font-bold text-2xl mb-1">Welcome back</h1>
      <p className="text-slatec text-sm mb-6">
        Log in to continue earning or advertising.
      </p>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-white text-navy font-semibold rounded-xl px-4 py-3 mb-4 hover:opacity-90 transition-all disabled:opacity-60"
      >
        <GoogleIcon /> Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-slatec">OR</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <div className="relative">
            <Icons.Mail
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slatec pointer-events-none"
            />
            <input
              type="email"
              className="input pl-10"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          {errors.email && (
            <p className="text-red-400 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Icons.Lock
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slatec pointer-events-none"
            />
            <input
              type={showPassword ? "text" : "password"}
              className="input pl-10 pr-10"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
          <div className="text-right mt-1.5">
            <Link
              to="/forgot-password"
              className="text-xs text-violet-light hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full font-sora flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner /> Signing in...
            </span>
          ) : (
            <>
              Sign In <Icons.ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slatec mt-6">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="text-violet-light font-semibold hover:underline"
        >
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] bg-violet/15 rounded-full blur-[100px] -top-32 -left-32 pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -bottom-24 -right-24 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 sm:p-8 w-full max-w-md relative z-10"
      >
        <div className="text-center mb-6">
          <Link to="/" className="font-sora font-extrabold text-xl">
            Zynk<span className="text-violet-light">Buzz</span>
          </Link>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.5 26.9 35.5 24 35.5c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.6 5.6C41.9 36 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

export function LoadingSpinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8z"
      />
    </svg>
  );
}
