import type { GscConnectAction } from "./types";

type GscConnectActionInput = {
  canManageIntegrations: boolean;
  oauthConfigured?: boolean;
};

export function isGscOAuthConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    hasEnvValue(env.SCCC_GSC_CLIENT_ID) &&
    hasEnvValue(env.SCCC_GSC_CLIENT_SECRET) &&
    hasEnvValue(env.SCCC_GSC_REDIRECT_URI)
  );
}

export function buildGscConnectAction(input: GscConnectActionInput): GscConnectAction {
  if (!input.canManageIntegrations) {
    return buildDisabledAction("Your role can not manage integrations.");
  }

  if (!(input.oauthConfigured ?? isGscOAuthConfigured())) {
    return buildDisabledAction("Google Search Console OAuth is not configured.");
  }

  return buildDisabledAction("Google Search Console OAuth callback is not implemented yet.");
}

function buildDisabledAction(disabledReason: string): GscConnectAction {
  return {
    type: "gsc_oauth",
    label: "Connect Google Search Console",
    enabled: false,
    disabledReason,
    requiresIntegrationManage: true,
    noMutation: true
  };
}

function hasEnvValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}
