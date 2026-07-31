import { useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { Icons } from "../components/icons/Icons";
import { useAuthStore } from "../store/authStore";
import { useAppStore } from "../store/appStore";
import { useTheme } from "../context/ThemeContext";
import { notify } from "../utils/notify";
import { cocobaseProfile, cocobaseAuth } from "../services/cocobase";

export default function Profile() {
  const { user, updateName, updateAvatar, logout } = useAuthStore();
  const { transactions, submissions, myTasks } = useAppStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isAdvertiser = user?.role === "advertiser";
  const isVerified = user?.isEmailVerified ?? false;

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith("image/")) {
      notify.error("Please select a valid image file.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const avatarUrl = await cocobaseProfile.uploadAvatar(user.id, file);
      updateAvatar(avatarUrl ?? null);
      notify.success("Profile photo updated successfully!");
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : "Could not upload your profile photo.",
      );
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      notify.error("Name cannot be empty");
      return;
    }
    if (nameInput.trim() === user?.name) {
      setEditingName(false);
      return;
    }
    if (!user?.id) {
      notify.error("Your session is unavailable. Please sign in again.");
      return;
    }

    setSavingName(true);
    try {
      await cocobaseProfile.updateName(user.id, nameInput.trim());
      updateName(nameInput.trim());
      notify.success("Name updated successfully!");
      setEditingName(false);
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : "Could not update your profile.",
      );
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelEdit = () => {
    setNameInput(user?.name ?? "");
    setEditingName(false);
  };

  const handleSendCode = async () => {
    try {
      await cocobaseAuth.requestEmailVerification();
      notify.success("Verification link sent to your email!");
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : "Unable to send verification email",
      );
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-sora font-bold text-2xl mb-1">Profile</h1>
        <p className="text-slatec text-sm">Manage your account details.</p>
      </div>

      {/* Avatar + name */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-5 sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl font-sora font-bold flex-shrink-0 overflow-hidden ${
              isAdvertiser
                ? "bg-violet/20 text-violet-light"
                : "bg-emerald2/20 text-emerald2"
            }`}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name ?? "Profile"}
                className="w-full h-full object-cover"
              />
            ) : (
              (user?.name?.charAt(0).toUpperCase() ?? "?")
            )}
          </div>

          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  className="input py-1.5 text-base font-semibold"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="text-emerald2 hover:text-emerald-400 transition-colors flex-shrink-0"
                >
                  <Icons.Confirm size={18} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-slatec hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Icons.Close size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="font-sora font-bold text-lg sm:text-xl truncate">
                  {user?.name}
                </h2>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-slatec hover:text-white transition-colors flex-shrink-0"
                >
                  <Icons.Edit size={14} />
                </button>
              </div>
            )}
            <p className="text-sm text-slatec truncate">{user?.email}</p>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-slatec transition-colors hover:text-white disabled:opacity-60"
            >
              <Icons.Upload size={13} />
              {uploadingAvatar ? "Uploading…" : "Upload photo"}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>
      </motion.div>

      {/* Compact stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card divide-x divide-border flex"
      >
        <StatCell
          label="Balance"
          value={`${(user?.walletBalance ?? 0).toLocaleString()}`}
          color="text-amber-400"
        />
        {isAdvertiser ? (
          <>
            <StatCell
              label="Posted"
              value={`${myTasks.length}`}
              color="text-violet-light"
            />
            <StatCell
              label="Spent"
              value={`${(user?.totalSpent ?? 0).toLocaleString()}`}
            />
          </>
        ) : (
          <>
            <StatCell
              label="Done"
              value={`${submissions.length}`}
              color="text-violet-light"
            />
            <StatCell
              label="Earned"
              value={`${(user?.totalEarned ?? 0).toLocaleString()}`}
              color="text-emerald2"
            />
          </>
        )}
        <StatCell label="Txns" value={`${transactions.length}`} />
      </motion.div>

      {/* Account */}
      <RowSection label="Account">
        <ProfileRow
          icon={isVerified ? Icons.Verified : Icons.Mail}
          label="Email Verification"
          value={isVerified ? "Verified" : "Not Verified"}
          valueColor={isVerified ? "text-emerald2" : "text-amber-400"}
          onClick={!isVerified ? handleSendCode : undefined}
          showChevron={!isVerified}
        />
        <ProfileRow
          icon={isAdvertiser ? Icons.Advertiser : Icons.Earner}
          label="Account Type"
          value={isAdvertiser ? "Advertiser" : "Earner"}
          showChevron={false}
        />
        <ProfileRow
          icon={Icons.Lock}
          label="Member Since"
          value="June 2026"
          showChevron={false}
        />
      </RowSection>

      {/* Preferences */}
      <RowSection label="Preferences">
        <ProfileRow
          icon={theme === "light" ? Sun : Moon}
          label="Theme"
          value={theme === "light" ? "Light" : "Dark"}
          onClick={toggleTheme}
        />
        <ProfileRow
          icon={Icons.Rocket}
          label="Referrals"
          onClick={() => navigate("/dashboard/referrals")}
        />
        <ProfileRow
          icon={Icons.Star}
          label="Leaderboard"
          onClick={() => navigate("/dashboard/leaderboard")}
        />
        <ProfileRow
          icon={Icons.Wallet}
          label="Withdrawals"
          onClick={() => navigate("/dashboard/withdrawals")}
        />
        {isAdvertiser && (
          <ProfileRow
            icon={Icons.Trending}
            label="Analytics"
            onClick={() => navigate("/dashboard/analytics")}
          />
        )}
      </RowSection>

      {/* Account Actions */}
      <div>
        <h2 className="font-sora font-bold text-base mb-3 flex items-center gap-2">
          <Icons.Warning size={15} /> Account Actions
        </h2>
        <div className="space-y-3">
          <ChangePasswordCard />
          <div className="card p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-semibold">Log out</div>
                <div className="text-xs text-slatec">
                  Sign out of your account on this device.
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  notify.info("Logged out successfully");
                  navigate("/");
                }}
                className="border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl px-4 py-2 text-sm font-semibold transition-all flex items-center gap-2"
              >
                <Icons.Logout size={15} /> Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex-1 px-2 py-3 text-center min-w-0">
      <div className={`font-sora font-bold text-sm sm:text-base ${color}`}>
        {value}
      </div>
      <div className="text-[10px] sm:text-xs text-slatec uppercase tracking-wide mt-0.5 truncate">
        {label}
      </div>
    </div>
  );
}

function RowSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-slatec uppercase tracking-wide mb-2 px-1">
        {label}
      </h2>
      <div className="card divide-y divide-border overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
  valueColor = "text-slatec",
  danger = false,
  onClick,
  showChevron = true,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value?: string;
  valueColor?: string;
  danger?: boolean;
  onClick?: () => void;
  showChevron?: boolean;
}) {
  const isInteractive = !!onClick;

  return (
    <Component
      as={isInteractive ? "button" : "div"}
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 sm:px-5 py-3.5 text-left transition-colors ${
        isInteractive ? "hover:bg-navy-2/60 cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon
          size={18}
          className={danger ? "text-red-400" : "text-slatec flex-shrink-0"}
        />
        <span
          className={`text-sm font-medium truncate ${danger ? "text-red-400" : ""}`}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {value && (
          <span className={`text-sm font-medium ${valueColor}`}>{value}</span>
        )}
        {isInteractive && showChevron && (
          <Icons.ChevronRight size={16} className="text-slatec" />
        )}
      </div>
    </Component>
  );
}

function Component({
  as: As,
  ...props
}: {
  as: "button" | "div";
  [key: string]: any;
}) {
  return <As {...props} />;
}

function ChangePasswordCard() {
  const [expanded, setExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!currentPassword) errs.currentPassword = "Current password is required";
    if (!newPassword) errs.newPassword = "New password is required";
    else if (!passwordRegex.test(newPassword)) {
      errs.newPassword = "Use 8+ chars with upper, lower, number and symbol";
    }
    if (!confirmPassword)
      errs.confirmPassword = "Please confirm your new password";
    else if (newPassword !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await cocobaseAuth.changePassword(currentPassword, newPassword);
      notify.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setExpanded(false);
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Unable to change password",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <div className="text-sm font-semibold">Change Password</div>
          <div className="text-xs text-slatec">
            Update the password for your account.
          </div>
        </div>
        <Icons.ChevronDown
          size={18}
          className={`text-slatec transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          onSubmit={handleSubmit}
          className="space-y-3 mt-4 pt-4 border-t border-border overflow-hidden"
        >
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            {errors.currentPassword && (
              <p className="text-red-400 text-xs mt-1">
                {errors.currentPassword}
              </p>
            )}
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {errors.newPassword && (
              <p className="text-red-400 text-xs mt-1">{errors.newPassword}</p>
            )}
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full font-sora flex items-center justify-center gap-2 mt-1"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </motion.form>
      )}
    </div>
  );
}
