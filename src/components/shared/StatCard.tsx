import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: "white" | "violet" | "green" | "yellow";
  delay?: number;
  icon?: ReactNode;
}

export default function StatCard({
  label,
  value,
  color = "white",
  delay = 0,
  icon,
}: StatCardProps) {
  const colorClasses: Record<string, string> = {
    white: "text-white",
    violet: "text-violet-light",
    green: "text-emerald2",
    yellow: "text-amber-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="stat-card"
    >
      <div className="text-xs text-slatec uppercase tracking-wide font-medium flex items-center gap-2">
        {icon ? <span className="text-base leading-none">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div
        className={`font-sora font-bold text-2xl sm:text-3xl ${colorClasses[color]}`}
      >
        {value}
      </div>
    </motion.div>
  );
}
