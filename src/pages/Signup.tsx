import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Icons } from "../components/icons/Icons";
import { useAuthStore } from "../store/authStore";
import { cocobaseAuth } from "../services/cocobase";
import { signInWithGoogle } from "../services/googleAuth";
import { notify } from "../utils/notify";
import { AuthShell, GoogleIcon, LoadingSpinner } from "./Login";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((s) => s.login);


  const initialRole =
    searchParams.get("role") === "advertiser" ? "advertiser" : "earner";

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "",
    password: "",
    confirmPassword: "",
  });
  const [role, setRole] = useState<"advertiser" | "earner">(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.email) errs.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      errs.email = "Enter a valid email";
    if (!form.phoneNumber.trim()) errs.phoneNumber = "Phone number is required";
    if (!form.dateOfBirth) errs.dateOfBirth = "Date of birth is required";
    if (!form.gender) errs.gender = "Please select a gender";
    if (!form.password) errs.password = "Password is required";
    else if (!passwordRegex.test(form.password)) {
      errs.password = "Use 8+ chars with upper, lower, number and symbol";
    }
    if (!form.confirmPassword)
      errs.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    if (!acceptedTerms) errs.terms = "You must accept the terms to continue";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const result = await cocobaseAuth.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        password: form.password,
        role,
      });
      if (!result.user) throw new Error("Unable to create account");

      login(
        result.user,
        result.token ?? "backend_token",
        result.refreshToken ?? "backend_refresh",
      );

      // Fire the verification email now that we have a valid session.
      try {
        await cocobaseAuth.requestEmailVerification();
      } catch (verifyError) {
        console.warn("Could not send verification email", verifyError);
      }

      setStep(2);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Account creation failed";
      console.error("Cocobase signup error", error);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const { credential } = await signInWithGoogle();
      const result = await cocobaseAuth.googleLogin(credential, role);
      if (!result.user) throw new Error("Unable to create account");

      login(
        result.user,
        result.token ?? "backend_token",
        result.refreshToken ?? "backend_refresh",
      );
      notify.success(`Welcome to Zynk, ${result.user.name}! 🎉`);
      navigate("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Google sign-up failed";
      console.error("Cocobase Google signup error", error);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await cocobaseAuth.requestEmailVerification();
      notify.success("Verification link resent!");
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : "Unable to resend verification email",
      );
    } finally {
      setResending(false);
    }
  };

  // ── Step 2: check your email ──
  if (step === 2) {
    return (
      <AuthShell>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-violet/15 flex items-center justify-center mx-auto">
            <Icons.Mail size={28} className="text-violet-light" />
          </div>
          <h1 className="font-sora font-bold text-2xl">Verify your email</h1>
          <p className="text-slatec text-sm leading-relaxed">
            We sent a verification link to{" "}
            <strong className="text-white">{form.email}</strong>. Click it to
            activate your account.
          </p>
          <div className="pt-2 space-y-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="btn-primary w-full font-sora flex items-center justify-center gap-2"
            >
              <Icons.Dashboard size={16} /> Continue to Dashboard
            </button>
            <button
              onClick={() => void handleResend()}
              disabled={resending}
              className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
            >
              <Icons.Refresh
                size={14}
                className={resending ? "animate-spin" : ""}
              />
              {resending ? "Resending..." : "Resend verification email"}
            </button>
          </div>
          <p className="text-xs text-slatec/70 pt-1">
            You can explore the dashboard now — some features unlock once your
            email is verified.
          </p>
        </motion.div>
      </AuthShell>
    );
  }

  // ── Step 1: registration form ──
  return (
    <AuthShell>
      <h1 className="font-sora font-bold text-2xl mb-1">Create your account</h1>
      <p className="text-slatec text-sm mb-5">
        Choose how you'd like to use Zynk.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <RoleButton
          active={role === "earner"}
          onClick={() => setRole("earner")}
          icon={<Icons.Earner size={20} />}
          label="Earner"
          color="green"
        />
        <RoleButton
          active={role === "advertiser"}
          onClick={() => setRole("advertiser")}
          icon={<Icons.Advertiser size={20} />}
          label="Advertiser"
          color="violet"
        />
      </div>

      <button
        onClick={handleGoogleSignup}
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First Name</label>
            <input
              className="input"
              placeholder="John"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            {errors.firstName && (
              <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>
            )}
          </div>
          <div>
            <label className="label">Last Name</label>
            <input
              className="input"
              placeholder="Doe"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
            {errors.lastName && (
              <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

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
          <label className="label">Phone Number</label>
          <input
            type="tel"
            className="input"
            placeholder="+1 555 123 4567"
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          />
          {errors.phoneNumber && (
            <p className="text-red-400 text-xs mt-1">{errors.phoneNumber}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date of Birth</label>
            <input
              type="date"
              className="input"
              value={form.dateOfBirth}
              onChange={(e) =>
                setForm({ ...form, dateOfBirth: e.target.value })
              }
            />
            {errors.dateOfBirth && (
              <p className="text-red-400 text-xs mt-1">{errors.dateOfBirth}</p>
            )}
          </div>
          <div>
            <label className="label">Gender</label>
            <select
              className="input"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            {errors.gender && (
              <p className="text-red-400 text-xs mt-1">{errors.gender}</p>
            )}
          </div>
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
              placeholder="At least 8 characters"
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
        </div>

        <div>
          <label className="label">Confirm Password</label>
          <div className="relative">
            <Icons.Lock
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slatec pointer-events-none"
            />
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="input pl-10 pr-10"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slatec hover:text-white transition-colors"
            >
              {showConfirmPassword ? (
                <Icons.EyeOff size={16} />
              ) : (
                <Icons.Eye size={16} />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-400 text-xs mt-1">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <div>
          <label className="flex items-start gap-2 text-sm text-slatec cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <span>I accepted all terms &amp; conditions</span>
          </label>
          {errors.terms && (
            <p className="text-red-400 text-xs mt-1">{errors.terms}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full font-sora flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner /> Creating account...
            </span>
          ) : (
            <>
              Create Account <Icons.ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slatec mt-6">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-violet-light font-semibold hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}

function RoleButton({
  active,
  onClick,
  icon,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: "violet" | "green";
}) {
  const activeClasses = {
    green: "border-emerald2 bg-emerald2/10 text-emerald2",
    violet: "border-violet bg-violet/10 text-violet-light",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 transition-all text-sm font-semibold ${
        active
          ? activeClasses[color]
          : "border-border text-slatec hover:border-white/20"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
