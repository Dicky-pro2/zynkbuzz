import { Bell, Check, AlertCircle, Gift, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { cocobaseNotifications } from "../services/cocobase";
import { useAppStore } from "../store/appStore";
import { useAuthStore } from "../store/authStore";

export default function NotificationCenter() {
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore(
    (s) => s.markAllNotificationsRead,
  );
  const setNotifications = useAppStore((s) => s.setNotifications);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.isRead).length);
  }, [notifications]);

  useEffect(() => {
    if (!currentUserId) return;

    const unsubscribe = cocobaseNotifications.subscribe(
      currentUserId,
      (nextNotifications) => {
        const currentNotifications = useAppStore.getState().notifications;
        setNotifications(
          nextNotifications.length > 0
            ? nextNotifications
            : currentNotifications,
        );
      },
    );

    return unsubscribe;
  }, [currentUserId, setNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task_completed":
        return <Check className="w-5 h-5 text-green-600" />;
      case "task_approved":
        return <Check className="w-5 h-5 text-green-600" />;
      case "task_rejected":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "deposit_success":
      case "withdrawal_processed":
        return <Gift className="w-5 h-5 text-purple-600" />;
      case "new_task":
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "task_completed":
      case "task_approved":
        return "border-l-green-600 bg-green-50 dark:bg-green-900/20";
      case "task_rejected":
        return "border-l-red-600 bg-red-50 dark:bg-red-900/20";
      case "deposit_success":
      case "withdrawal_processed":
        return "border-l-purple-600 bg-purple-50 dark:bg-purple-900/20";
      case "new_task":
        return "border-l-blue-600 bg-blue-50 dark:bg-blue-900/20";
      default:
        return "border-l-gray-600 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const recentNotifications = notifications.slice(-5).reverse();

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1 -translate-y-1 bg-red-600 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length > 0 ? (
              <div className="space-y-2 p-4">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border-l-4 flex items-start justify-between gap-4 cursor-pointer transition-colors hover:opacity-75 ${getNotificationColor(
                      notification.type,
                    )} ${notification.isRead ? "opacity-60" : ""}`}
                    onClick={() =>
                      !notification.isRead &&
                      markNotificationRead(notification.id)
                    }
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-1 flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          {new Date(
                            notification.createdAt,
                          ).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No notifications yet
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {recentNotifications.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-slate-700 text-center">
              <a
                href="/dashboard/notifications"
                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
              >
                View All Notifications →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Close on click outside */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
