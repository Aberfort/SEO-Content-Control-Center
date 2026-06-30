import { headers } from "next/headers";

export class CsrfError extends Error {
  constructor() {
    super("CSRF_INVALID");
  }
}

type HeaderReader = {
  get(name: string): string | null;
};

export function assertRequestSameOrigin(request: Request): void {
  assertSameOrigin({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host")
  });
}

export async function assertServerActionSameOrigin(): Promise<void> {
  const headerStore = await headers();
  assertSameOrigin({
    origin: headerStore.get("origin"),
    host: headerStore.get("host"),
    forwardedHost: headerStore.get("x-forwarded-host")
  });
}

export function assertSameOrigin(input: {
  origin: string | null;
  host: string | null;
  forwardedHost?: string | null;
  appUrl?: string;
}): void {
  if (!isSameOrigin(input)) {
    throw new CsrfError();
  }
}

export function isSameOrigin(input: {
  origin: string | null;
  host: string | null;
  forwardedHost?: string | null;
  appUrl?: string;
}): boolean {
  if (!input.origin) {
    return false;
  }

  const originHost = parseHost(input.origin);

  if (!originHost) {
    return false;
  }

  const allowedHosts = new Set(
    [input.host, input.forwardedHost, parseHost(input.appUrl ?? process.env.NEXT_PUBLIC_APP_URL)]
      .filter((host): host is string => Boolean(host))
      .map(normalizeHost)
  );

  return allowedHosts.has(normalizeHost(originHost));
}

export function isCsrfError(error: unknown): boolean {
  return error instanceof CsrfError;
}

function parseHost(input: string | undefined): string | null {
  if (!input) {
    return null;
  }

  try {
    return new URL(input).host;
  } catch {
    return input;
  }
}

function normalizeHost(host: string): string {
  return host.trim().toLowerCase();
}

export function readHeader(reader: HeaderReader, name: string): string | null {
  return reader.get(name);
}
