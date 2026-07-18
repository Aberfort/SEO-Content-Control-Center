#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const placeholderFragments = [
  "replace-with",
  "example.com",
  "hooks.example.com",
  "smtp.example.com",
  "localhost",
  "127.0.0.1",
  "sccc:sccc",
  "sccc-password"
];

const defaultEnvFile = ".env.production.local";

function printUsage() {
  console.log(`Usage: scripts/verify-production-env.mjs [options]

Options:
  --env-file <path>          Env file to validate. Defaults to .env.production.local.
  --environment <name>       production or staging. Defaults to production.
  --allow-placeholders       Validate template shape while downgrading placeholder/missing-value findings.
  --help                     Show this help text.
`);
}

function parseArgs(argv) {
  const options = {
    envFile: defaultEnvFile,
    environment: "production",
    allowPlaceholders: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      return { ...options, help: true };
    }

    if (arg === "--allow-placeholders") {
      options.allowPlaceholders = true;
      continue;
    }

    if (arg === "--env-file") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--env-file requires a path");
      }
      options.envFile = value;
      index += 1;
      continue;
    }

    if (arg === "--environment") {
      const value = argv[index + 1];
      if (!value || !["production", "staging"].includes(value)) {
        throw new Error("--environment must be production or staging");
      }
      options.environment = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function parseEnvFile(filePath) {
  const contents = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const [index, rawLine] of contents.split(/\r?\n/).entries()) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      throw new Error(`Invalid env line ${index + 1}: ${rawLine}`);
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (!/^[A-Z0-9_]+$/.test(key)) {
      throw new Error(`Invalid env key on line ${index + 1}: ${key}`);
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlaceholder(value) {
  if (!hasValue(value)) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return placeholderFragments.some((fragment) => normalized.includes(fragment));
}

function createReporter(options) {
  const findings = [];

  const add = (level, key, message) => {
    findings.push({ level, key, message });
  };

  const fail = (key, message) => {
    add("error", key, message);
  };

  const warn = (key, message) => {
    add("warning", key, message);
  };

  const placeholderOrFail = (key, message) => {
    if (options.allowPlaceholders) {
      warn(key, `${message} Template placeholder mode allowed this value.`);
    } else {
      fail(key, message);
    }
  };

  return { findings, fail, warn, placeholderOrFail };
}

function validateUrl(env, reporter, key, input) {
  const value = env[key];
  const allowedProtocols = input.allowedProtocols ?? ["https:"];

  if (!hasValue(value)) {
    reporter.placeholderOrFail(key, `${key} is required.`);
    return null;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    reporter.fail(key, `${key} must be a valid URL.`);
    return null;
  }

  if (!allowedProtocols.includes(parsed.protocol)) {
    reporter.fail(key, `${key} must use ${allowedProtocols.join(" or ")}.`);
  }

  if (input.originOnly && (parsed.pathname !== "/" || parsed.search || parsed.hash)) {
    reporter.fail(key, `${key} must be an origin without a path, query, or hash.`);
  }

  if (isPlaceholder(value)) {
    reporter.placeholderOrFail(key, `${key} still contains a placeholder or local value.`);
  }

  return parsed;
}

function requireValue(env, reporter, key, input = {}) {
  const value = env[key];

  if (!hasValue(value)) {
    reporter.placeholderOrFail(key, `${key} is required.`);
    return "";
  }

  if (input.allowedValues && !input.allowedValues.includes(value)) {
    reporter.fail(key, `${key} must be one of: ${input.allowedValues.join(", ")}.`);
  }

  if (input.minLength && value.length < input.minLength) {
    reporter.fail(key, `${key} must be at least ${input.minLength} characters.`);
  }

  if (input.noPlaceholder !== false && isPlaceholder(value)) {
    reporter.placeholderOrFail(key, `${key} still contains a placeholder or local value.`);
  }

  return value;
}

function validatePort(env, reporter, key) {
  const value = requireValue(env, reporter, key, { noPlaceholder: false });
  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535 || String(port) !== value.trim()) {
    reporter.fail(key, `${key} must be an integer port between 1 and 65535.`);
  }
}

function validateSecret(env, reporter, key) {
  requireValue(env, reporter, key, { minLength: 32 });
}

function validateProductionEnv(env, options) {
  const reporter = createReporter(options);
  const isProduction = options.environment === "production";

  requireValue(env, reporter, "NODE_ENV", {
    allowedValues: ["production"],
    noPlaceholder: false
  });

  const appUrl = validateUrl(env, reporter, "NEXT_PUBLIC_APP_URL", {
    allowedProtocols: ["https:"],
    originOnly: true
  });
  const marketingUrl = validateUrl(env, reporter, "NEXT_PUBLIC_MARKETING_URL", {
    allowedProtocols: ["https:"],
    originOnly: true
  });

  if (appUrl && marketingUrl && appUrl.origin === marketingUrl.origin) {
    reporter.fail(
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_MARKETING_URL must be distinct public origins."
    );
  }

  validateUrl(env, reporter, "DATABASE_URL", {
    allowedProtocols: ["postgresql:", "postgres:"]
  });
  validateUrl(env, reporter, "REDIS_URL", {
    allowedProtocols: ["redis:", "rediss:"]
  });
  requireValue(env, reporter, "SCCC_DATA_STORE", {
    allowedValues: ["prisma"],
    noPlaceholder: false
  });

  validateSecret(env, reporter, "AUTH_SECRET");
  validateSecret(env, reporter, "SCCC_PLUGIN_SIGNING_SECRET");
  validateSecret(env, reporter, "SCCC_TOKEN_ENCRYPTION_KEY");

  requireValue(env, reporter, "SCCC_EMAIL_TRANSPORT", {
    allowedValues: ["smtp"],
    noPlaceholder: false
  });
  requireValue(env, reporter, "SCCC_EMAIL_FROM");
  requireValue(env, reporter, "SCCC_SMTP_HOST");
  validatePort(env, reporter, "SCCC_SMTP_PORT");

  const smtpUser = env.SCCC_SMTP_USER ?? "";
  const smtpPassword = env.SCCC_SMTP_PASSWORD ?? "";
  if (hasValue(smtpUser) !== hasValue(smtpPassword)) {
    reporter.fail(
      "SCCC_SMTP_USER",
      "SCCC_SMTP_USER and SCCC_SMTP_PASSWORD must be set together or left empty together."
    );
  } else if (!hasValue(smtpUser)) {
    reporter.warn(
      "SCCC_SMTP_USER",
      "SMTP auth credentials are empty. Confirm the production SMTP provider allows this."
    );
  }

  validateUrl(env, reporter, "SCCC_MARKETING_LEAD_WEBHOOK_URL", {
    allowedProtocols: ["https:"]
  });
  if (!hasValue(env.SCCC_MARKETING_LEAD_WEBHOOK_SECRET)) {
    reporter.warn(
      "SCCC_MARKETING_LEAD_WEBHOOK_SECRET",
      "Marketing lead webhook has no bearer secret. Configure one unless the endpoint uses another auth layer."
    );
  } else if (isPlaceholder(env.SCCC_MARKETING_LEAD_WEBHOOK_SECRET)) {
    reporter.placeholderOrFail(
      "SCCC_MARKETING_LEAD_WEBHOOK_SECRET",
      "SCCC_MARKETING_LEAD_WEBHOOK_SECRET still contains a placeholder or local value."
    );
  }

  const billingProvider = env.SCCC_BILLING_PROVIDER || "none";
  if (billingProvider !== "stripe") {
    const message =
      "SCCC_BILLING_PROVIDER must be stripe for production checkout and portal flows.";
    if (isProduction && !options.allowPlaceholders) {
      reporter.fail("SCCC_BILLING_PROVIDER", message);
    } else {
      reporter.warn("SCCC_BILLING_PROVIDER", message);
    }
  } else {
    requireValue(env, reporter, "SCCC_STRIPE_SECRET_KEY");
    requireValue(env, reporter, "SCCC_STRIPE_PRICE_STARTER");
    requireValue(env, reporter, "SCCC_STRIPE_PRICE_PRO");
    requireValue(env, reporter, "SCCC_STRIPE_PRICE_AGENCY");
    validateUrl(env, reporter, "SCCC_BILLING_SUCCESS_URL", { allowedProtocols: ["https:"] });
    validateUrl(env, reporter, "SCCC_BILLING_CANCEL_URL", { allowedProtocols: ["https:"] });
    validateUrl(env, reporter, "SCCC_BILLING_PORTAL_RETURN_URL", {
      allowedProtocols: ["https:"]
    });
    validateSecret(env, reporter, "STRIPE_WEBHOOK_SECRET");
  }

  requireValue(env, reporter, "SCCC_GSC_CLIENT_ID");
  validateSecret(env, reporter, "SCCC_GSC_CLIENT_SECRET");
  validateSecret(env, reporter, "SCCC_GSC_STATE_SECRET");
  const gscRedirect = validateUrl(env, reporter, "SCCC_GSC_REDIRECT_URI", {
    allowedProtocols: ["https:"]
  });

  if (appUrl && gscRedirect) {
    if (gscRedirect.origin !== appUrl.origin) {
      reporter.fail(
        "SCCC_GSC_REDIRECT_URI",
        "SCCC_GSC_REDIRECT_URI must use the same origin as NEXT_PUBLIC_APP_URL."
      );
    }

    if (gscRedirect.pathname !== "/api/integrations/gsc/callback") {
      reporter.fail(
        "SCCC_GSC_REDIRECT_URI",
        "SCCC_GSC_REDIRECT_URI must end with /api/integrations/gsc/callback."
      );
    }
  }

  validateUrl(env, reporter, "SENTRY_DSN", { allowedProtocols: ["https:"] });
  requireValue(env, reporter, "SENTRY_ENVIRONMENT", { noPlaceholder: false });
  requireValue(env, reporter, "POSTHOG_KEY");

  if (hasValue(env.POSTHOG_HOST)) {
    validateUrl(env, reporter, "POSTHOG_HOST", { allowedProtocols: ["https:"] });
  }

  validatePort(env, reporter, "SCCC_WORKER_HEALTH_PORT");

  if (hasValue(env.SCCC_AI_PROVIDER)) {
    requireValue(env, reporter, "SCCC_AI_PROVIDER", {
      allowedValues: ["anthropic"],
      noPlaceholder: false
    });
    validateSecret(env, reporter, "SCCC_AI_API_KEY");
  } else {
    reporter.warn(
      "SCCC_AI_PROVIDER",
      "Assistant AI provider is disabled. Deterministic recommendations still work."
    );
  }

  if (!hasValue(env.SCCC_RESTORE_TEST_DATABASE_URL)) {
    reporter.warn(
      "SCCC_RESTORE_TEST_DATABASE_URL",
      "Backup restore smoke target is unset. Configure a disposable restore DB before final launch rehearsal."
    );
  }

  return reporter.findings;
}

function summarize(findings) {
  const errors = findings.filter((finding) => finding.level === "error");
  const warnings = findings.filter((finding) => finding.level === "warning");

  for (const finding of errors) {
    console.error(`[env-check] FAIL ${finding.key}: ${finding.message}`);
  }

  for (const finding of warnings) {
    console.warn(`[env-check] WARN ${finding.key}: ${finding.message}`);
  }

  console.log(
    `[env-check] Summary: ${errors.length} error(s), ${warnings.length} warning(s), ${findings.length} finding(s).`
  );

  return errors.length;
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  const envFile = path.resolve(process.cwd(), options.envFile);
  const env = parseEnvFile(envFile);
  const findings = validateProductionEnv(env, options);
  const errorCount = summarize(findings);

  if (errorCount > 0) {
    process.exit(1);
  }

  console.log(`[env-check] ${envFile} is ready for ${options.environment} checks.`);
} catch (error) {
  console.error(`[env-check] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
