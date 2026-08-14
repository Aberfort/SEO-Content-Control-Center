type HeaderReader = {
  get(name: string): string | null;
};

const defaultLocalOrigin = "http://localhost:3000";

export function requestOriginFromHeaders(headerStore: HeaderReader): string | null {
  const origin = normalizeHttpOrigin(headerStore.get("origin"));

  if (origin) {
    return origin;
  }

  const host = readForwardedValue(headerStore.get("x-forwarded-host")) ?? headerStore.get("host");
  const protocol = readForwardedValue(headerStore.get("x-forwarded-proto")) ?? "http";
  return host ? normalizeHttpOrigin(`${protocol}://${host}`) : null;
}

export function resolvePluginConnectionEndpoint(
  headerStore: HeaderReader,
  configuredEndpoint = process.env.NEXT_PUBLIC_APP_URL
): string {
  return (
    requestOriginFromHeaders(headerStore) ??
    normalizeHttpOrigin(configuredEndpoint ?? null) ??
    defaultLocalOrigin
  );
}

function normalizeHttpOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function readForwardedValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}
