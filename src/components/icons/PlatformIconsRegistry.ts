import * as simpleIcons from "simple-icons";

interface PlatformMeta {
  path: string;
  color: string;
  hex: string;
}

const LINKEDIN_PATH =
  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

const PLATFORM_MAP: Record<string, PlatformMeta> = {
  Instagram: {
    path: simpleIcons.siInstagram.path,
    color: "#E1306C",
    hex: "E1306C",
  },
  "Twitter/X": {
    path: simpleIcons.siX.path,
    color: "currentColor",
    hex: "000000",
  },
  TikTok: {
    path: simpleIcons.siTiktok.path,
    color: "currentColor",
    hex: "000000",
  },
  YouTube: {
    path: simpleIcons.siYoutube.path,
    color: "#FF0000",
    hex: "FF0000",
  },
  Facebook: {
    path: simpleIcons.siFacebook.path,
    color: "#1877F2",
    hex: "1877F2",
  },
  LinkedIn: {
    path: LINKEDIN_PATH,
    color: "#0A66C2",
    hex: "0A66C2",
  },
};

export function getPlatformMeta(platform: string): PlatformMeta | undefined {
  return PLATFORM_MAP[platform];
}

export const SUPPORTED_PLATFORMS = Object.keys(PLATFORM_MAP);
