import env from "../config/env";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: {
              credential?: string;
              error?: string;
            }) => void;
          }) => void;
          prompt: (
            callback?: (notification: {
              isNotDisplayed?: () => boolean;
              isSkippedMoment?: () => boolean;
            }) => void,
          ) => void;
        };
      };
    };
  }
}

let sdkPromise: Promise<void> | null = null;

function decodeGoogleCredential(credential: string) {
  try {
    const [, payload] = credential.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = window.atob(normalized);
    return JSON.parse(decoded) as {
      email?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
    };
  } catch {
    return null;
  }
}

export async function signInWithGoogle(): Promise<{
  credential: string;
  profile: { email?: string; name?: string };
}> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error("Google authentication is not configured.");
  }

  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(
          new Error(
            "Google authentication is unavailable in this environment.",
          ),
        );
        return;
      }

      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      const existingScript = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]',
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Unable to load Google authentication.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Unable to load Google authentication."));
      document.body.appendChild(script);
    });
  }

  await sdkPromise;

  if (!window.google?.accounts?.id) {
    throw new Error("Google authentication is unavailable right now.");
  }

  return new Promise<{
    credential: string;
    profile: { email?: string; name?: string };
  }>((resolve, reject) => {
    const handleResponse = (response: {
      credential?: string;
      error?: string;
    }) => {
      if (response.credential) {
        const profile = decodeGoogleCredential(response.credential);
        resolve({
          credential: response.credential,
          profile: {
            email: profile?.email,
            name:
              profile?.name ||
              [profile?.given_name, profile?.family_name]
                .filter(Boolean)
                .join(" "),
          },
        });
        return;
      }

      reject(new Error(response.error || "Google sign-in was cancelled."));
    };

    if (!window.google?.accounts?.id) {
      reject(new Error("Google authentication is unavailable right now."));
      return;
    }

    window.google.accounts.id.initialize({
      client_id: env.GOOGLE_CLIENT_ID,
      callback: handleResponse,
    });

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed?.()) {
        reject(new Error("Google sign-in prompt was not shown."));
      }
      if (notification.isSkippedMoment?.()) {
        reject(new Error("Google sign-in was skipped."));
      }
    });
  });
}
