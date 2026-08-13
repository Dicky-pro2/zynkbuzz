import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Icons } from "../icons/Icons";
import { useAuthStore } from "../../store/authStore";
import { notify } from "../../utils/notify";
import VerificationBanner from "./VerificationBanner";
import NotificationCenter from "../NotificationCenter";

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdvertiser = user?.role === "advertiser";
  const isAdmin = user?.role === "admin";

  const getInitials = () => {
    const baseName = user?.name?.trim() || "";
    const first = user?.firstName?.trim() || "";
    const last = user?.lastName?.trim() || "";

    const source = baseName || `${first} ${last}`.trim();
    if (!source) return "U";

    return (
      source
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "U"
    );
  };

  const handleLogout = () => {
    logout();
    notify.info("Logged out successfully");
    navigate("/");
  };

  const navItems = [
    { to: "/dashboard", icon: Icons.Dashboard, label: "Overview", end: true },
    { to: "/dashboard/tasks", icon: Icons.Tasks, label: "Tasks", end: false },
    {
      to: "/dashboard/wallet",
      icon: Icons.Wallet,
      label: "Wallet",
      end: false,
    },
    ...(isAdvertiser
      ? [
          {
            to: "/dashboard/review",
            icon: Icons.Review,
            label: "Review",
            end: false,
          },
        ]
      : [
          {
            to: "/dashboard/submissions",
            icon: Icons.Submissions,
            label: "Submissions",
            end: false,
          },
          {
            to: "/dashboard/withdrawals",
            icon: Icons.Wallet,
            label: "Withdrawals",
            end: false,
          },
        ]),
    ...(isAdmin
      ? [
          {
            to: "/dashboard/admin",
            icon: Icons.Settings,
            label: "Admin",
            end: false,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-navy">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-navy/90 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="font-sora font-extrabold text-xl flex-shrink-0">
            Zynk<span className="text-violet-light">Buzz</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-card border border-border rounded-full p-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    isActive
                      ? isAdvertiser
                        ? "bg-violet text-white"
                        : "bg-emerald2 text-white"
                      : "text-slatec hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                isAdvertiser
                  ? "bg-violet/10 border-violet/30 text-violet-light"
                  : "bg-emerald2/10 border-emerald2/30 text-emerald2"
              }`}
            >
              <span className="flex items-center gap-1">
                {isAdvertiser ? (
                  <>
                    {" "}
                    <Icons.Advertiser size={13} /> Advertiser{" "}
                  </>
                ) : (
                  <>
                    {" "}
                    <Icons.Earner size={13} /> Earner{" "}
                  </>
                )}
              </span>
            </div>

            <div className="bg-card border border-border rounded-full px-3 sm:px-4 py-1.5 text-sm font-semibold flex items-center gap-1.5">
              <span className="text-amber-400">
                <Icons.Coins />
              </span>
              <span>{(user?.walletBalance ?? 0).toLocaleString()}</span>
            </div>

            <NotificationCenter />

            <NavLink
              to="/dashboard/profile"
              title="Profile"
              className={({ isActive }) =>
                `border rounded-full overflow-hidden transition-all ${
                  isActive
                    ? "border-violet-light"
                    : "border-border hover:border-violet-light"
                }`
              }
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || "Profile"}
                  className="h-8 w-8 sm:h-10 sm:w-10 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center bg-violet/15 text-xs font-bold text-violet-light">
                  {getInitials()}
                </div>
              )}
            </NavLink>

            <button
              onClick={handleLogout}
              title="Logout"
              className="border border-border rounded-full p-1.5 sm:p-2 text-slatec hover:border-red-500/50 hover:text-red-400 transition-all"
            >
              <Icons.Logout size={16} />
            </button>
          </div>
        </div>

        <div className="sm:hidden flex items-center justify-around border-t border-border px-2 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? isAdvertiser
                      ? "text-violet-light"
                      : "text-emerald2"
                    : "text-slatec"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/dashboard/profile"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? isAdvertiser
                    ? "text-violet-light"
                    : "text-emerald2"
                  : "text-slatec"
              }`
            }
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || "Profile"}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet/15 text-[10px] font-bold text-violet-light">
                {getInitials()}
              </div>
            )}
            Profile
          </NavLink>
        </div>
      </nav>

      {/* Verification banner — only shows when email is not verified */}
      {!user?.isEmailVerified && <VerificationBanner />}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
