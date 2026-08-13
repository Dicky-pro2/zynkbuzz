import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Toaster from "./components/Toaster";
//import ErrorBoundary from './components/ErrorBoundary';
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import ResendVerification from "./pages/ResendVerification";
import DashboardLayout from "./components/layout/DashboardLayout";
import Overview from "./pages/OverView";
import Tasks from "./pages/Tasks";
import Wallet from "./pages/Wallet";
import Submissions from "./pages/Submissions";
import Review from "./pages/Review";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminImpact from "./pages/admin/AdminImpact";
import Referral from "./pages/Referral";
import Leaderboard from "./pages/Leaderboard";
import WithdrawalHistory from "./pages/WithdrawalHistory";
import AdvertiserAnalytics from "./pages/AdvertiserAnalytics";
import { useAuthStore } from "./store/authStore";
import { ThemeProvider } from "./context/ThemeContext";
import ResetPassword from "./pages/ResetPassword";
import "./styles/theme.css";

// Wraps a page component in a RouteErrorBoundary
function SafePage({ children }: { children: React.ReactNode }) {
  return <RouteErrorBoundary>{children}</RouteErrorBoundary>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster />
        <Routes>
          {/* Public */}
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <Landing />
            }
          />
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
          />
          <Route
            path="/signup"
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <Signup />
            }
          />
          <Route
            path="/forgot-password"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <ForgotPassword />
              )
            }
          />
          <Route
            path="/reset-password"
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <ResetPassword />
            }
          />

          {/* Verification */}
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/resend-verification" element={<ResendVerification />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />
            }
          >
            <Route
              index
              element={
                <SafePage>
                  <Overview />
                </SafePage>
              }
            />
            <Route
              path="tasks"
              element={
                <SafePage>
                  <Tasks />
                </SafePage>
              }
            />
            <Route
              path="wallet"
              element={
                <SafePage>
                  <Wallet />
                </SafePage>
              }
            />
            <Route
              path="withdrawals"
              element={
                <SafePage>
                  <WithdrawalHistory />
                </SafePage>
              }
            />
            <Route
              path="submissions"
              element={
                <SafePage>
                  <Submissions />
                </SafePage>
              }
            />
            <Route
              path="review"
              element={
                <SafePage>
                  <Review />
                </SafePage>
              }
            />
            <Route
              path="profile"
              element={
                <SafePage>
                  <Profile />
                </SafePage>
              }
            />
            <Route
              path="referrals"
              element={
                <SafePage>
                  <Referral />
                </SafePage>
              }
            />
            <Route
              path="leaderboard"
              element={
                <SafePage>
                  <Leaderboard />
                </SafePage>
              }
            />
            <Route
              path="analytics"
              element={
                <SafePage>
                  <AdvertiserAnalytics />
                </SafePage>
              }
            />
            <Route
              path="admin"
              element={
                <RequireAdmin>
                  <SafePage>
                    <AdminLayout />
                  </SafePage>
                </RequireAdmin>
              }
            >
              <Route
                index
                element={
                  <SafePage>
                    <AdminDashboard />
                  </SafePage>
                }
              />
              <Route
                path="withdrawals"
                element={
                  <SafePage>
                    <AdminWithdrawals />
                  </SafePage>
                }
              />
              <Route
                path="impact"
                element={
                  <SafePage>
                    <AdminImpact />
                  </SafePage>
                }
              />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
