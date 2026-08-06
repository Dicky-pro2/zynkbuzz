import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Eye,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { useQualityScoreStore } from "../store/qualityScoreStore";
import { useAuthStore } from "../store/authStore";

export default function AdvertiserAnalyticsDashboard() {
  const user = useAuthStore((s) => s.user);
  const { getAdvertiserAnalytics } = useQualityScoreStore();
  const [dateRange, setDateRange] = useState("week"); // week, month, all

  if (!user || user.role !== "advertiser") {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 dark:text-gray-400">
          Only advertisers can access this page
        </p>
      </div>
    );
  }

  const analytics = getAdvertiserAnalytics(user.id);

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 dark:text-gray-400">
          No analytics data available yet
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📊 Campaign Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Monitor your task performance and engagement metrics
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <button
              onClick={() => setDateRange("week")}
              className={`px-4 py-2 rounded transition-colors ${
                dateRange === "week"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateRange("month")}
              className={`px-4 py-2 rounded transition-colors ${
                dateRange === "month"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateRange("all")}
              className={`px-4 py-2 rounded transition-colors ${
                dateRange === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600"
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Spent */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Spent
              </p>
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${analytics.totalSpent.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {dateRange === "week"
                ? "This week"
                : dateRange === "month"
                  ? "This month"
                  : "All time"}
            </p>
          </div>

          {/* Completions */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Task Completions
              </p>
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {analytics.totalCompletions}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {analytics.totalTasksPosted} tasks posted
            </p>
          </div>

          {/* Completion Rate */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Completion Rate
              </p>
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {analytics.completionRate.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Of available slots
            </p>
          </div>

          {/* Avg Cost Per Completion */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Avg Cost/Completion
              </p>
              <Eye className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${analytics.averageCostPerCompletion.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              ROI optimized
            </p>
          </div>
        </div>

        {/* Click & Engagement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Total Clicks
            </h3>
            <p className="text-4xl font-bold text-blue-600 mb-2">
              {analytics.totalClicks}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Average{" "}
              {(analytics.totalClicks / analytics.totalTasksPosted).toFixed(1)}{" "}
              clicks per task
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Engagement Rate
            </h3>
            <p className="text-4xl font-bold text-green-600 mb-2">
              {analytics.totalClicks > 0
                ? (
                    (analytics.totalCompletions / analytics.totalClicks) *
                    100
                  ).toFixed(1)
                : "0"}
              %
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click-to-completion conversion
            </p>
          </div>
        </div>

        {/* Tasks Performance */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Task Performance
            </h2>
          </div>

          {analytics.tasksData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">
                      Task
                    </th>
                    <th className="text-right py-4 px-6 font-semibold text-gray-900 dark:text-white">
                      Posted
                    </th>
                    <th className="text-right py-4 px-6 font-semibold text-gray-900 dark:text-white">
                      Clicks
                    </th>
                    <th className="text-right py-4 px-6 font-semibold text-gray-900 dark:text-white">
                      Completions
                    </th>
                    <th className="text-right py-4 px-6 font-semibold text-gray-900 dark:text-white">
                      Cost/Task
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-900 dark:text-white">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.tasksData.map((task) => (
                    <tr
                      key={task.taskId}
                      className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {task.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {task.taskId}
                        </p>
                      </td>
                      <td className="text-right py-4 px-6 text-gray-900 dark:text-white">
                        {new Date(task.posted).toLocaleDateString()}
                      </td>
                      <td className="text-right py-4 px-6 text-gray-900 dark:text-white">
                        {task.clicks}
                      </td>
                      <td className="text-right py-4 px-6 font-semibold text-green-600">
                        {task.completions}
                      </td>
                      <td className="text-right py-4 px-6 font-semibold text-blue-600">
                        ${task.costPerTask.toFixed(2)}
                      </td>
                      <td className="text-center py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            task.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : task.status === "completed"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              No task data available
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
            <h3 className="font-bold text-purple-900 dark:text-purple-200 mb-3">
              💡 Performance Tips
            </h3>
            <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-300">
              <li>
                ✓ Lower task costs attract more workers and increase completions
              </li>
              <li>
                ✓ Clear instructions reduce rejections and improve quality
              </li>
              <li>
                ✓ Post tasks during peak hours (9 AM - 5 PM UTC) for better
                engagement
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3">
              🎯 Optimization
            </h3>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
              <li>
                ✓ Target workers with higher quality scores (80+) for better
                results
              </li>
              <li>
                ✓ Set reasonable completion timeframes to meet worker
                expectations
              </li>
              <li>✓ Monitor competitor pricing to stay competitive</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
