import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useAppStore } from "../../store/appStore";
import { cocobaseTasks } from "../../services/cocobase";
import { notify } from "../../utils/notify";
import { Icons } from "../icons/Icons";
import { PlatformIcon } from "../icons/PlatformIcons";
import { calculateAdvertiserImpact } from "../../utils/transactionMath";

const PLATFORM_OPTIONS = [
  "Instagram",
  "Twitter/X",
  "TikTok",
  "YouTube",
  "Facebook",
  "LinkedIn",
] as const;
const TASK_TYPE_OPTIONS = [
  "Follow",
  "Like",
  "Comment",
  "Share",
  "Subscribe",
  "View",
] as const;

const TASK_TYPE_LABELS: Record<string, string> = {
  Follow: "Follow Account",
  Like: "Like Post",
  Comment: "Comment on Post",
  Share: "Share / Retweet",
  Subscribe: "Subscribe Channel",
  View: "Watch Video (30s+)",
};

export default function CreateTaskForm() {
  const { user } = useAuthStore();
  const { addTask, pushActivity, addNotification } = useAppStore();

  const [platform, setPlatform] = useState<string>(PLATFORM_OPTIONS[0]);
  const [taskType, setTaskType] = useState<string>(TASK_TYPE_OPTIONS[0]);
  const [url, setUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [reward, setReward] = useState(10);
  const [slots, setSlots] = useState(10);
  const [minQualityScore, setMinQualityScore] = useState(0);

  const totalCost = reward * slots;
  const impactPreview = calculateAdvertiserImpact(totalCost);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      notify.error("Please enter a profile or post URL");
      return;
    }
    if (!user) return;

    if (user.walletBalance < totalCost) {
      notify.error(
        `Not enough coins! Need ${totalCost.toLocaleString()} but have ${user.walletBalance.toLocaleString()}`,
      );
      return;
    }

    try {
      const createdTask = await cocobaseTasks.create({
        advertiser: user.id,
        advertiserId: user.id,
        advertiserName: user.name,
        advertiserDisplayName: user.name,
        advertiserEmail: user.email,
        platform,
        taskType,
        title: `${taskType} on ${platform}`,
        instructions:
          instructions.trim() ||
          `Go to the link and ${taskType.toLowerCase()} as instructed.`,
        url: url.trim(),
        reward,
        totalSlots: slots,
        status: "active",
        minQualityScore,
      });

      if (!createdTask) {
        notify.error("Could not publish the task right now.");
        return;
      }

      addTask(createdTask);
      pushActivity(
        `New task posted: ${taskType} on ${platform} · ${reward} coins x${slots}`,
        "violet",
      );
      addNotification({
        type: "new_task",
        title: "Task Posted!",
        message: `Your ${taskType} task on ${platform} is now live with ${slots} slots.`,
      });
      notify.taskPosted(totalCost);

      setUrl("");
      setInstructions("");
      setMinQualityScore(0);
    } catch (error) {
      console.error("Failed to create task", error);
      notify.error("Could not publish the task. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      {/* Platform selector */}
      <div>
        <label className="label">Platform</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PLATFORM_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`rounded-xl px-2 py-3 text-center text-xs font-medium transition-all border flex flex-col items-center gap-1.5 ${
                platform === p
                  ? "border-violet bg-violet/15 text-violet-light"
                  : "border-border text-slatec hover:border-white/20"
              }`}
            >
              <PlatformIcon
                platform={p}
                size={22}
                className={platform === p ? "opacity-100" : "opacity-60"}
              />
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Task type */}
      <div>
        <label className="label">Task Type</label>
        <select
          className="input"
          value={taskType}
          onChange={(e) => setTaskType(e.target.value)}
        >
          {TASK_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {TASK_TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </div>

      {/* URL */}
      <div>
        <label className="label">Profile / Post URL</label>
        <div className="relative">
          <Icons.Link
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slatec pointer-events-none"
          />
          <input
            className="input pl-10"
            placeholder="https://instagram.com/yourprofile"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
      </div>

      {/* Instructions */}
      <div>
        <label className="label">Instructions for Earner</label>
        <textarea
          className="input min-h-[80px] resize-y"
          placeholder="e.g. Follow my account and stay for at least 7 days..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      {/* Reward + Slots */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label flex items-center gap-1.5">
            <Icons.Wallet size={12} /> Reward per task (coins)
          </label>
          <input
            type="number"
            min={1}
            className="input"
            value={reward}
            onChange={(e) => setReward(Math.max(1, Number(e.target.value)))}
          />
        </div>
        <div>
          <label className="label flex items-center gap-1.5">
            <Icons.User size={12} /> Number of slots
          </label>
          <input
            type="number"
            min={1}
            className="input"
            value={slots}
            onChange={(e) => setSlots(Math.max(1, Number(e.target.value)))}
          />
        </div>
      </div>

      <div>
        <label className="label">Minimum quality score</label>
        <select
          className="input"
          value={minQualityScore}
          onChange={(e) => setMinQualityScore(Number(e.target.value))}
        >
          <option value={0}>Any earner</option>
          <option value={40}>40+</option>
          <option value={60}>60+</option>
          <option value={80}>80+</option>
        </select>
      </div>

      {/* Total cost preview */}
      <div className="bg-navy-2 border border-border rounded-xl px-4 py-2.5 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slatec flex items-center gap-1.5">
            <Icons.CoinOut size={14} /> Total cost
          </span>
          <span className="font-sora font-bold text-amber-400 flex items-center gap-1.5">
            <Icons.Wallet size={14} />
            {totalCost.toLocaleString()} coins
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slatec">Estimated impact</span>
          <span className="font-sora font-bold text-violet-light">
            {impactPreview.follows} follows • {impactPreview.likes} likes •{" "}
            {impactPreview.engagement} engagement
          </span>
        </div>
      </div>

      <button
        type="submit"
        className="btn-primary w-full font-sora flex items-center justify-center gap-2"
      >
        <Icons.Rocket size={16} /> Post Task
      </button>
    </form>
  );
}
