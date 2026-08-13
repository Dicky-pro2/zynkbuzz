// src/config/env.ts
// All environment variables go through here — never import import.meta.env directly
// in components. This makes it easy to see all config in one place and
// swap values between dev/staging/production without touching component code.

const devFallback = import.meta.env.DEV;
const env = {
  // API
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL ??
    (devFallback ? "http://localhost:5000/api" : ""),

  COCOBASE_API_KEY: import.meta.env.VITE_COCOBASE_API_KEY ?? "",
  COCOBASE_PROJECT_ID: import.meta.env.VITE_COCOBASE_PROJECT_ID ?? "",
  COCOBASE_BASE_URL:
    import.meta.env.VITE_COCOBASE_BASE_URL ?? "https://api.cocobase.cc",

  // App
  APP_NAME: import.meta.env.VITE_APP_NAME ?? "Zynk",
  APP_URL:
    import.meta.env.VITE_APP_URL ??
    (devFallback ? "http://localhost:5173" : ""),

  // Auth
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",

  // Paystack
  PAYSTACK_PUBLIC_KEY: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? "",

  // Feature flags
  IS_MOCK: import.meta.env.VITE_USE_MOCK === "true",
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,

  // Misc
  APP_VERSION: import.meta.env.VITE_APP_VERSION ?? "1.0.0",
} as const;

// Validate required variables in production
if (env.IS_PROD && !env.IS_MOCK) {
  const required = [
    "VITE_API_BASE_URL",
    "VITE_GOOGLE_CLIENT_ID",
    "VITE_PAYSTACK_PUBLIC_KEY",
    "VITE_COCOBASE_API_KEY",
    "VITE_COCOBASE_PROJECT_ID",
  ] as const;
  const missing = required.filter((key) => !import.meta.env[key]);

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables in production: ${missing.join(", ")}. Some features may not work correctly.`,
    );
    const message = `Missing required environment variables in production: ${missing.join(", ")}`;
    console.error(message);
    throw new Error(message);
  }
}

if (env.IS_PROD && env.IS_MOCK) {
  console.warn(
    "Production is running in mock mode because VITE_USE_MOCK=true.",
  );
}

export default env;
