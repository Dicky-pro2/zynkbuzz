import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';

export default function ActivityFeed() {
  const activity = useAppStore((s) => s.activity);

  return (
    <div className="card p-5 max-h-[420px] overflow-y-auto">
      {activity.length === 0 ? (
        <div className="text-center py-10 text-slatec">
          <div className="text-3xl mb-2">📭</div>
          No activity yet but don't worry, we'll keep you updated with the latest news and updates.
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {activity.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-navy-2 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2.5"
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.type === 'green' ? 'bg-emerald2' : 'bg-violet-light'
                  }`}
                />
                <span className="flex-1">{item.msg}</span>
                <span className="text-xs text-slatec">{item.time}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}