import { Resend } from "resend";

const fallbackAppUrl = "http://localhost:5173";

function getAppUrl() {
  return process.env.APP_URL || process.env.VITE_APP_URL || fallbackAppUrl;
}

function getSender() {
  return "ZynkBuzz <onboarding@resend.dev>";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendVerificationEmail({
  to,
  name,
  token,
}: {
  to: string;
  name?: string;
  token: string;
}) {
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const displayName = name?.trim() || "there";
  const verifyUrl = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
      <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
        <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Verify your ZynkBuzz email</h1>
        <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
        <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">
          Thanks for creating your ZynkBuzz account. Please verify your email address to activate it.
        </p>
        <div style="margin:24px 0; text-align:center;">
          <a href="${verifyUrl}" style="display:inline-block; background:#8b5cf6; color:#ffffff; text-decoration:none; padding:14px 22px; border-radius:10px; font-weight:700;">
            Verify Email
          </a>
        </div>
        <p style="margin:0 0 10px; color:#cbd5e1; font-size:14px;">
          This verification link expires in 30 minutes.
        </p>
        <p style="margin:0 0 10px; color:#cbd5e1; font-size:14px;">
          If the button does not work, use this link:
        </p>
        <p style="margin:0 0 18px; word-break:break-all; color:#a78bfa; font-size:13px;">${escapeHtml(verifyUrl)}</p>
        <p style="margin:0; color:#94a3b8; font-size:13px;">
          If you did not create this account, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  const text = `Hi ${displayName},\n\nThanks for creating your ZynkBuzz account. Please verify your email address to activate it.\n\nVerify your email: ${verifyUrl}\n\nThis verification link expires in 30 minutes.\n\nIf you did not create this account, you can safely ignore this email.`;

  return resend.emails.send({
    from: getSender(),
    to,
    subject: "Verify your ZynkBuzz email",
    html,
    text,
  });
}

export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name?: string;
}) {
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const displayName = name?.trim() || "there";

  const html = `
    <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
      <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
        <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Welcome to ZynkBuzz 🎉</h1>
        <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
        <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">
          Your email is now verified and your ZynkBuzz account is ready to go.
        </p>
        <p style="margin:0; color:#94a3b8; font-size:13px;">
          You can now continue exploring tasks, wallet features, rewards, and your account dashboard.
        </p>
      </div>
    </div>
  `;

  const text = `Hi ${displayName},\n\nWelcome to ZynkBuzz! Your email is verified and your account is ready to go.\n\nYou can now continue exploring tasks, wallet features, rewards, and your dashboard.`;

  return resend.emails.send({
    from: getSender(),
    to,
    subject: "Welcome to ZynkBuzz 🎉",
    html,
    text,
  });
}
