import { NavLink, Outlet } from "react-router-dom";
import { Icons } from "../../components/icons/Icons";

const items = [
  { to: "/dashboard/admin", label: "Overview", icon: Icons.Dashboard },
  {
    to: "/dashboard/admin/withdrawals",
    label: "Withdrawals",
    icon: Icons.CoinOut,
  },
  { to: "/dashboard/admin/impact", label: "Impact", icon: Icons.Trending },
];

export default function AdminLayout() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sora font-bold text-2xl">Admin Console</h1>
          <p className="text-sm text-slatec">
            Manage platform operations and monitor conversions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "border-violet bg-violet/15 text-violet-light"
                    : "border-border text-slatec hover:border-white/20"
                }`
              }
            >
              <span className="flex items-center gap-2">
                <item.icon size={14} /> {item.label}
              </span>
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
