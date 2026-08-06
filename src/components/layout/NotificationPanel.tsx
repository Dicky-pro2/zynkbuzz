import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Icons } from "../icons/Icons";
import { useAppStore } from "../../store/appStore";
import { useAuthStore } from "../../store/authStore";

const TYPE_ICONS: Record<string, string> = {
  task_completed: "✅",
  task_approved: "💰",
  task_rejected: "❌",
  deposit_success: "💳",
  withdrawal_processed: "💸",
  new_task: "🚀",
  welcome: "🎉",
};

interface NotificationPanelProps {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, markAllNotificationsRead, markNotificationRead } =
    useAppStore();
  const { user } = useAuthStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const isAdvertiser = user?.role === "advertiser";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 card z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-sora font-bold text-sm">Notifications</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isAdvertiser ? "bg-violet/15 text-violet-light" : "bg-emerald2/15 text-emerald2"}`}
          >
            {isAdvertiser ? "Advertiser" : "Earner"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={markAllNotificationsRead}
              className="text-xs text-violet-light hover:text-white flex items-center gap-1 transition-colors"
            >
              <Icons.MarkAllRead size={14} /> Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slatec hover:text-white transition-colors"
          >
            <Icons.Close size={16} />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-10 text-slatec">
            <div className="text-3xl mb-2">🔔</div>
            No notifications yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/5 ${
                  !n.isRead
                    ? isAdvertiser
                      ? "bg-violet/5"
                      : "bg-emerald2/5"
                    : ""
                }`}
              >
                <div className="text-xl flex-shrink-0 mt-0.5">
                  {TYPE_ICONS[n.type] ?? "🔔"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold leading-snug">
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span
                        className={`w-2 h-2 rounded-full ${isAdvertiser ? "bg-violet" : "bg-emerald2"} flex-shrink-0 mt-1.5`}
                      />
                    )}
                  </div>
                  <p className="text-xs text-slatec leading-relaxed mt-0.5">
                    {n.message}
                  </p>
                  <p className="text-xs text-slatec/60 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
