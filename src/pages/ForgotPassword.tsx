import { useState } from "react";
import { Link } from "react-router-dom";
import { Icons } from "../components/icons/Icons";
import { cocobaseAuth, isCocobaseEnabled } from "../services/cocobase";
import { notify } from "../utils/notify";
import { AuthShell, LoadingSpinner } from "./Login";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
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
      if (isCocobaseEnabled) {
        await cocobaseAuth.forgotPassword(email);
      } else {
        await new Promise((r) => setTimeout(r, 800));
      }
      setSent(true);
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Unable to send reset link",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Link
        to="/login"
        className="flex items-center gap-1.5 text-slatec hover:text-white text-sm mb-6 transition-colors"
      >
        <Icons.ArrowLeft size={16} /> Back to login
      </Link>

      {sent ? (
        <div className="text-center py-4">
          <div className="text-4xl mb-3">📬</div>
          <h2 className="font-sora font-bold text-xl mb-2">Check your email</h2>
          <p className="text-slatec text-sm">
            We sent a reset link to{" "}
            <strong className="text-white">{email}</strong>.
            {isCocobaseEnabled
              ? " Please check your inbox."
              : " Demo mode: no real email was sent."}
          </p>
        </div>
      ) : (
        <>
          <h1 className="font-sora font-bold text-2xl mb-1">Reset Password</h1>
          <p className="text-slatec text-sm mb-6">
            Enter your email and we'll send you a reset link.
          </p>
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
                "Send Reset Link"
              )}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
