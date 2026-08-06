import { getPlatformMeta } from "./PlatformIconsRegistry";

interface PlatformIconProps {
  platform: string;
  size?: number;
  className?: string;
}

export function PlatformIcon({
  platform,
  size = 20,
  className = "",
}: PlatformIconProps) {
  const meta = getPlatformMeta(platform);
  if (!meta) return null;

  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={meta.color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={platform}
    >
      <path d={meta.path} />
    </svg>
  );
}
