import { Resend } from "resend";

const fallbackAppUrl = "http://localhost:5173";

function getAppUrl() {
  return process.env.APP_URL || process.env.VITE_APP_URL || fallbackAppUrl;
}

function getSender() {
  return "ZynkBuzz <noreply@zynkbuzz.com>";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return resend.emails.send({
    from: getSender(),
    to,
    subject,
    html,
    text,
  });
}

export async function sendVerificationEmail({
  to,
  name,
  token,
}: {
  to: string;
  name?: string;
  token: string;
}) {
  const displayName = name?.trim() || "there";
  const verifyUrl = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;

  return sendEmail({
    to,
    subject: "Verify your ZynkBuzz email",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Verify your ZynkBuzz email</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">Thanks for creating your ZynkBuzz account. Please verify your email address to activate it.</p>
          <div style="margin:24px 0; text-align:center;">
            <a href="${verifyUrl}" style="display:inline-block; background:#8b5cf6; color:#ffffff; text-decoration:none; padding:14px 22px; border-radius:10px; font-weight:700;">Verify Email</a>
          </div>
          <p style="margin:0 0 10px; color:#cbd5e1; font-size:14px;">This verification link expires in 30 minutes.</p>
          <p style="margin:0 0 10px; color:#cbd5e1; font-size:14px;">If the button does not work, use this link:</p>
          <p style="margin:0 0 18px; word-break:break-all; color:#a78bfa; font-size:13px;">${escapeHtml(verifyUrl)}</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">If you did not create this account, you can safely ignore this email.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nThanks for creating your ZynkBuzz account. Please verify your email address to activate it.\n\nVerify your email: ${verifyUrl}\n\nThis verification link expires in 30 minutes.\n\nIf you did not create this account, you can safely ignore this email.`,
  });
}

export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name?: string;
}) {
  const displayName = name?.trim() || "there";

  return sendEmail({
    to,
    subject: "Welcome to ZynkBuzz 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Welcome to ZynkBuzz 🎉</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">Your email is now verified and your ZynkBuzz account is ready to go.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">You can now continue exploring tasks, wallet features, rewards, and your dashboard.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nWelcome to ZynkBuzz! Your email is verified and your account is ready to go.\n\nYou can now continue exploring tasks, wallet features, rewards, and your dashboard.`,
  });
}

export async function sendPasswordResetEmail({
  to,
  name,
  token,
}: {
  to: string;
  name?: string;
  token: string;
}) {
  const displayName = name?.trim() || "there";
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  return sendEmail({
    to,
    subject: "Reset your ZynkBuzz password",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Reset your password</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">We received a request to reset your ZynkBuzz password. Use the link below to choose a new one.</p>
          <div style="margin:24px 0; text-align:center;">
            <a href="${resetUrl}" style="display:inline-block; background:#f59e0b; color:#111827; text-decoration:none; padding:14px 22px; border-radius:10px; font-weight:700;">Reset Password</a>
          </div>
          <p style="margin:0 0 10px; color:#cbd5e1; font-size:14px;">This reset link expires in 30 minutes.</p>
          <p style="margin:0 0 10px; color:#cbd5e1; font-size:14px;">If the button does not work, use this link:</p>
          <p style="margin:0 0 18px; word-break:break-all; color:#fcd34d; font-size:13px;">${escapeHtml(resetUrl)}</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nWe received a request to reset your ZynkBuzz password.\n\nReset your password: ${resetUrl}\n\nThis reset link expires in 30 minutes.\n\nIf you did not request this, you can safely ignore this email.`,
  });
}

export async function sendPasswordChangedEmail({
  to,
  name,
}: {
  to: string;
  name?: string;
}) {
  const displayName = name?.trim() || "there";

  return sendEmail({
    to,
    subject: "Your ZynkBuzz password was changed",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Password changed</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">Your ZynkBuzz password was updated successfully. If this was not you, reset your password immediately.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">We did not include your new password in this email.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nYour ZynkBuzz password was changed successfully.\n\nIf this was not you, reset your password immediately.\n\nWe did not include your new password in this email.`,
  });
}

export async function sendWalletFundedEmail({
  to,
  name,
  amount,
  reference,
  balance,
}: {
  to: string;
  name?: string;
  amount: number;
  reference: string;
  balance: number;
}) {
  const displayName = name?.trim() || "there";

  return sendEmail({
    to,
    subject: "Your ZynkBuzz wallet has been funded 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Wallet funded</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">Your ZynkBuzz wallet has been funded with ${formatMoney(amount)}.</p>
          <p style="margin:0 0 8px; color:#cbd5e1; font-size:14px;"><strong>Reference:</strong> ${escapeHtml(reference)}</p>
          <p style="margin:0 0 8px; color:#cbd5e1; font-size:14px;"><strong>New balance:</strong> ${formatMoney(balance)}</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">This payment was confirmed on the server and is now available for use in your wallet.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nYour ZynkBuzz wallet has been funded with ${formatMoney(amount)}.\n\nReference: ${reference}\nNew balance: ${formatMoney(balance)}\n\nThis payment was confirmed on the server and is now available in your wallet.`,
  });
}

export async function sendWithdrawalRequestedEmail({
  to,
  name,
  amount,
}: {
  to: string;
  name?: string;
  amount: number;
}) {
  const displayName = name?.trim() || "there";

  return sendEmail({
    to,
    subject: "Withdrawal requested",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Withdrawal requested</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">Your withdrawal request for ${formatMoney(amount)} has been received and is now being reviewed.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">You will receive another email once it is processed.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nYour withdrawal request for ${formatMoney(amount)} has been received and is being reviewed.\n\nYou will receive another email once it is processed.`,
  });
}

export async function sendWithdrawalSuccessEmail({
  to,
  name,
  amount,
}: {
  to: string;
  name?: string;
  amount: number;
}) {
  const displayName = name?.trim() || "there";

  return sendEmail({
    to,
    subject: "Your ZynkBuzz withdrawal was sent",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Withdrawal sent</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">Your withdrawal of ${formatMoney(amount)} has been approved and sent.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">Please allow a little time for the bank or payment provider to process the transfer.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nYour withdrawal of ${formatMoney(amount)} has been approved and sent.\n\nPlease allow a little time for the bank or payment provider to process the transfer.`,
  });
}

export async function sendWithdrawalFailedEmail({
  to,
  name,
  amount,
}: {
  to: string;
  name?: string;
  amount: number;
}) {
  const displayName = name?.trim() || "there";

  return sendEmail({
    to,
    subject: "Withdrawal update",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Withdrawal review needed</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">Your withdrawal request for ${formatMoney(amount)} could not be processed and needs a review.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">Please check your dashboard for the latest status.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nYour withdrawal request for ${formatMoney(amount)} could not be processed and needs a review.\n\nPlease check your dashboard for the latest status.`,
  });
}

export async function sendTaskAvailableEmail({
  to,
  name,
  taskTitle,
}: {
  to: string;
  name?: string;
  taskTitle: string;
}) {
  const displayName = name?.trim() || "there";

  return sendEmail({
    to,
    subject: `New task available: ${taskTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">New task available</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">A new opportunity is available: ${escapeHtml(taskTitle)}. Head to your dashboard to review the details.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">Take a look before it fills up.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nA new opportunity is available: ${taskTitle}. Head to your dashboard to review the details.`,
  });
}

export async function sendTaskSubmittedEmail({
  to,
  name,
  taskTitle,
}: {
  to: string;
  name?: string;
  taskTitle: string;
}) {
  const displayName = name?.trim() || "there";

  return sendEmail({
    to,
    subject: "Task submitted successfully",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Task submitted</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">Your submission for ${escapeHtml(taskTitle)} has been received and is now awaiting review.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">You will be notified once the review is complete.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nYour submission for ${taskTitle} has been received and is now awaiting review.`,
  });
}

export async function sendTaskApprovedEmail({
  to,
  name,
  taskTitle,
}: {
  to: string;
  name?: string;
  taskTitle: string;
}) {
  const displayName = name?.trim() || "there";

  return sendEmail({
    to,
    subject: "Your task submission was approved ✅",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Task approved</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">Your work on ${escapeHtml(taskTitle)} has been approved.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">Your reward is now reflected in the wallet.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nYour work on ${taskTitle} has been approved.\n\nYour reward is now reflected in the wallet.`,
  });
}

export async function sendTaskRejectedEmail({
  to,
  name,
  taskTitle,
}: {
  to: string;
  name?: string;
  taskTitle: string;
}) {
  const displayName = name?.trim() || "there";

  return sendEmail({
    to,
    subject: "Task submission update",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Task review update</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">Your submission for ${escapeHtml(taskTitle)} needs another review and was not approved this time.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">Please check the task details and resubmit if appropriate.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nYour submission for ${taskTitle} needs another review and was not approved this time.\n\nPlease check the task details and resubmit if appropriate.`,
  });
}

export async function sendCampaignSubmittedEmail({
  to,
  name,
  campaignName,
}: {
  to: string;
  name?: string;
  campaignName: string;
}) {
  const displayName = name?.trim() || "there";

  return sendEmail({
    to,
    subject: "Campaign submitted for review",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Campaign submitted</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">Your campaign, ${escapeHtml(campaignName)}, has been submitted and will be reviewed by the admin team.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">You will receive a status update once the review is complete.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nYour campaign, ${campaignName}, has been submitted and will be reviewed by the admin team.\n\nYou will receive a status update once the review is complete.`,
  });
}

export async function sendCampaignApprovedEmail({
  to,
  name,
  campaignName,
}: {
  to: string;
  name?: string;
  campaignName: string;
}) {
  const displayName = name?.trim() || "there";

  return sendEmail({
    to,
    subject: "Campaign approved",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Campaign approved</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">Your campaign, ${escapeHtml(campaignName)}, has been approved and is now live.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">You can monitor performance from the dashboard.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nYour campaign, ${campaignName}, has been approved and is now live.\n\nYou can monitor performance from the dashboard.`,
  });
}

export async function sendCampaignRejectedEmail({
  to,
  name,
  campaignName,
}: {
  to: string;
  name?: string;
  campaignName: string;
}) {
  const displayName = name?.trim() || "there";

  return sendEmail({
    to,
    subject: "Campaign review update",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Campaign update</h1>
          <p style="margin:0 0 12px; color:#cbd5e1; font-size:16px;">Hi ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">Your campaign, ${escapeHtml(campaignName)}, requires attention before it can be approved.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">Please review the task details and update the campaign to continue.</p>
        </div>
      </div>
    `,
    text: `Hi ${displayName},\n\nYour campaign, ${campaignName}, requires attention before it can be approved.\n\nPlease review the task details and update the campaign to continue.`,
  });
}

export async function sendAdminWithdrawalNotification({
  amount,
  userEmail,
}: {
  amount: number;
  userEmail: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@zynkbuzz.com";

  return sendEmail({
    to: adminEmail,
    subject: "New ZynkBuzz withdrawal request",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Withdrawal request</h1>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">A new withdrawal request has been created for ${escapeHtml(userEmail)} for ${formatMoney(amount)}.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">Please review the request in the admin dashboard.</p>
        </div>
      </div>
    `,
    text: `A new withdrawal request has been created for ${userEmail} for ${formatMoney(amount)}. Please review it in the admin dashboard.`,
  });
}

export async function sendAdminCampaignNotification({
  campaignName,
  advertiserEmail,
}: {
  campaignName: string;
  advertiserEmail: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@zynkbuzz.com";

  return sendEmail({
    to: adminEmail,
    subject: "Campaign requires review",
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b1120; color:#e5e7eb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid #2d3748; border-radius:16px; padding:24px;">
          <h1 style="margin:0 0 16px; color:#ffffff; font-size:28px;">Campaign review needed</h1>
          <p style="margin:0 0 18px; color:#cbd5e1; line-height:1.6;">The campaign ${escapeHtml(campaignName)} from ${escapeHtml(advertiserEmail)} is waiting for admin review.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">Please review and approve or reject it from the admin dashboard.</p>
        </div>
      </div>
    `,
    text: `The campaign ${campaignName} from ${advertiserEmail} is waiting for admin review. Please review it in the admin dashboard.`,
  });
}
