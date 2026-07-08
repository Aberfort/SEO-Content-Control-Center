import nodemailer from "nodemailer";

export type EmailDeliveryStatus =
  | {
      provider: "noop";
      status: "skipped";
      reason: string;
    }
  | {
      provider: "smtp";
      status: "sent";
      messageId: string;
    }
  | {
      provider: "smtp";
      status: "failed";
      reason: string;
    };

export type InviteEmailInput = {
  to: string;
  inviteUrl: string;
  organizationName: string;
  inviterEmail: string;
  role: string;
  expiresAt: string;
};

export type EmailVerificationInput = {
  to: string;
  name: string;
  verificationUrl: string;
  expiresAt: string;
};

type EmailConfig =
  | {
      transport: "noop";
      from: string;
    }
  | {
      transport: "smtp";
      from: string;
      host: string;
      port: number;
      secure: boolean;
      user?: string;
      password?: string;
    };

export async function sendInviteEmail(input: InviteEmailInput): Promise<EmailDeliveryStatus> {
  const config = resolveEmailConfig();
  const message = composeInviteEmail(input);

  if (config.transport === "noop") {
    return {
      provider: "noop",
      status: "skipped",
      reason: "Email transport is disabled."
    };
  }

  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user
        ? {
            user: config.user,
            pass: config.password ?? ""
          }
        : undefined
    });
    const info = await transport.sendMail({
      from: config.from,
      to: input.to,
      subject: message.subject,
      text: message.text,
      html: message.html
    });

    return {
      provider: "smtp",
      status: "sent",
      messageId: info.messageId
    };
  } catch {
    return {
      provider: "smtp",
      status: "failed",
      reason: "SMTP delivery failed."
    };
  }
}

export async function sendEmailVerificationEmail(
  input: EmailVerificationInput
): Promise<EmailDeliveryStatus> {
  const config = resolveEmailConfig();
  const message = composeEmailVerificationEmail(input);

  if (config.transport === "noop") {
    return {
      provider: "noop",
      status: "skipped",
      reason: "Email transport is disabled."
    };
  }

  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user
        ? {
            user: config.user,
            pass: config.password ?? ""
          }
        : undefined
    });
    const info = await transport.sendMail({
      from: config.from,
      to: input.to,
      subject: message.subject,
      text: message.text,
      html: message.html
    });

    return {
      provider: "smtp",
      status: "sent",
      messageId: info.messageId
    };
  } catch {
    return {
      provider: "smtp",
      status: "failed",
      reason: "SMTP delivery failed."
    };
  }
}

export function composeInviteEmail(input: InviteEmailInput) {
  const organizationName = input.organizationName.trim() || "SEO Content Control Center";
  const expiresAt = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(input.expiresAt));
  const subject = `Invitation to join ${organizationName}`;
  const text = [
    `${input.inviterEmail} invited you to join ${organizationName} as ${input.role}.`,
    "",
    `Accept invite: ${input.inviteUrl}`,
    "",
    `This invite expires ${expiresAt}.`
  ].join("\n");
  const html = `
    <p>${escapeHtml(input.inviterEmail)} invited you to join <strong>${escapeHtml(
      organizationName
    )}</strong> as ${escapeHtml(input.role)}.</p>
    <p><a href="${escapeHtml(input.inviteUrl)}">Accept invite</a></p>
    <p>This invite expires ${escapeHtml(expiresAt)}.</p>
  `;

  return {
    subject,
    text,
    html
  };
}

export function composeEmailVerificationEmail(input: EmailVerificationInput) {
  const name = input.name.trim() || input.to;
  const expiresAt = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(input.expiresAt));
  const subject = "Verify your SEO Content Control Center email";
  const text = [
    `Hi ${name},`,
    "",
    "Verify your email address to finish securing your SEO Content Control Center account.",
    "",
    `Verify email: ${input.verificationUrl}`,
    "",
    `This verification link expires ${expiresAt}.`
  ].join("\n");
  const html = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Verify your email address to finish securing your SEO Content Control Center account.</p>
    <p><a href="${escapeHtml(input.verificationUrl)}">Verify email</a></p>
    <p>This verification link expires ${escapeHtml(expiresAt)}.</p>
  `;

  return {
    subject,
    text,
    html
  };
}

export function resolveEmailConfig(env: NodeJS.ProcessEnv = process.env): EmailConfig {
  const transport = env.SCCC_EMAIL_TRANSPORT === "smtp" ? "smtp" : "noop";
  const from = env.SCCC_EMAIL_FROM ?? "SEO Content Control Center <no-reply@localhost>";

  if (transport === "noop") {
    return {
      transport,
      from
    };
  }

  return {
    transport,
    from,
    host: env.SCCC_SMTP_HOST ?? "localhost",
    port: Number.parseInt(env.SCCC_SMTP_PORT ?? "1025", 10),
    secure: env.SCCC_SMTP_SECURE === "true",
    user: env.SCCC_SMTP_USER || undefined,
    password: env.SCCC_SMTP_PASSWORD || undefined
  };
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
