import { describe, expect, it } from "vitest";

import {
  composeEmailVerificationEmail,
  composeInviteEmail,
  composePasswordResetEmail,
  resolveEmailConfig,
  sendInviteEmail
} from "./email";

describe("email delivery", () => {
  it("uses noop transport by default", async () => {
    const status = await sendInviteEmail({
      to: "editor@example.com",
      inviteUrl: "https://app.example.com/auth/accept-invite?token=token",
      organizationName: "Acme SEO",
      inviterEmail: "owner@example.com",
      role: "EDITOR",
      expiresAt: new Date("2026-07-01T10:00:00.000Z").toISOString()
    });

    expect(status).toEqual({
      provider: "noop",
      status: "skipped",
      reason: "Email transport is disabled."
    });
  });

  it("resolves SMTP settings for Mailpit-compatible local delivery", () => {
    expect(
      resolveEmailConfig({
        SCCC_EMAIL_TRANSPORT: "smtp",
        SCCC_SMTP_HOST: "mailpit",
        SCCC_SMTP_PORT: "1025",
        SCCC_EMAIL_FROM: "SCCC <invites@example.com>"
      })
    ).toEqual({
      transport: "smtp",
      from: "SCCC <invites@example.com>",
      host: "mailpit",
      port: 1025,
      secure: false,
      user: undefined,
      password: undefined
    });
  });

  it("escapes invite email HTML content", () => {
    const message = composeInviteEmail({
      to: "editor@example.com",
      inviteUrl: 'https://app.example.com/auth/accept-invite?token="<token>"',
      organizationName: "<Acme SEO>",
      inviterEmail: "owner@example.com",
      role: "EDITOR",
      expiresAt: new Date("2026-07-01T10:00:00.000Z").toISOString()
    });

    expect(message.subject).toBe("Invitation to join <Acme SEO>");
    expect(message.html).toContain("&lt;Acme SEO&gt;");
    expect(message.html).toContain("&quot;&lt;token&gt;&quot;");
  });

  it("escapes email verification HTML content", () => {
    const message = composeEmailVerificationEmail({
      to: "owner@example.com",
      name: "<Owner>",
      verificationUrl: 'https://app.example.com/auth/verify-email?token="<token>"',
      expiresAt: new Date("2026-07-01T10:00:00.000Z").toISOString()
    });

    expect(message.subject).toBe("Verify your SEO Content Control Center email");
    expect(message.html).toContain("&lt;Owner&gt;");
    expect(message.html).toContain("&quot;&lt;token&gt;&quot;");
  });

  it("escapes password reset HTML content", () => {
    const message = composePasswordResetEmail({
      to: "owner@example.com",
      name: "<Owner>",
      resetUrl: 'https://app.example.com/auth/reset-password?token="<token>"',
      expiresAt: new Date("2026-07-01T10:00:00.000Z").toISOString()
    });

    expect(message.subject).toBe("Reset your SEO Content Control Center password");
    expect(message.html).toContain("&lt;Owner&gt;");
    expect(message.html).toContain("&quot;&lt;token&gt;&quot;");
  });
});
