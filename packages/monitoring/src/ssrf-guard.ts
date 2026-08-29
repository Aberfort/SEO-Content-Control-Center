import { promises as dns } from "node:dns";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

const allowedProtocols = new Set(["http:", "https:"]);

export function assertAllowedUrlShape(rawUrl: string): URL {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("URL_INVALID");
  }

  if (!allowedProtocols.has(url.protocol)) {
    throw new UnsafeUrlError("URL_PROTOCOL_NOT_ALLOWED");
  }

  if (!url.hostname) {
    throw new UnsafeUrlError("URL_HOSTNAME_REQUIRED");
  }

  return url;
}

/**
 * Blocks loopback, private, link-local (including the 169.254.169.254 cloud
 * metadata endpoint), and other reserved ranges for both address families.
 */
export function isPrivateOrReservedAddress(address: string, family: 4 | 6): boolean {
  return family === 4 ? isPrivateOrReservedIpv4(address) : isPrivateOrReservedIpv6(address);
}

function isPrivateOrReservedIpv4(address: string): boolean {
  const octets = address.split(".").map((part) => Number(part));

  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  const [a, b] = octets as [number, number, number, number];

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local, incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0 && octets[2] === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && octets[2] === 2) return true; // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 (benchmark)
  if (a === 198 && b === 51 && octets[2] === 100) return true; // 198.51.100.0/24 (TEST-NET-2)
  if (a === 203 && b === 0 && octets[2] === 113) return true; // 203.0.113.0/24 (TEST-NET-3)
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + broadcast

  return false;
}

function isPrivateOrReservedIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === "::1" || normalized === "::") return true; // loopback / unspecified

  const firstHextet = parseFirstHextet(normalized);

  if (firstHextet !== null) {
    if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) return true; // fe80::/10 link-local
    if (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) return true; // fc00::/7 unique local
    if (firstHextet >= 0xff00 && firstHextet <= 0xffff) return true; // ff00::/8 multicast
  }

  if (normalized.startsWith("2001:db8:")) return true; // documentation range

  // IPv4-mapped / translated addresses (::ffff:a.b.c.d, 64:ff9b::a.b.c.d) — validate the embedded IPv4.
  const mappedMatch = normalized.match(/(?:^::ffff:|^64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedMatch) {
    return isPrivateOrReservedIpv4(mappedMatch[1]!);
  }

  return false;
}

function parseFirstHextet(address: string): number | null {
  if (address.startsWith("::")) {
    // A leading compressed group is the zero hextet, which never falls in a blocked range;
    // ::ffff:a.b.c.d / ::1 / :: are handled separately above.
    return 0;
  }

  const firstSegment = address.split(":")[0];

  if (!firstSegment || !/^[0-9a-f]{1,4}$/.test(firstSegment)) {
    return null;
  }

  return Number.parseInt(firstSegment, 16);
}

export async function resolvePublicHostname(
  hostname: string
): Promise<Array<{ address: string; family: 4 | 6 }>> {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });

  if (records.length === 0) {
    throw new UnsafeUrlError("DNS_RESOLUTION_EMPTY");
  }

  for (const record of records) {
    const family = record.family === 6 ? 6 : 4;

    if (isPrivateOrReservedAddress(record.address, family)) {
      throw new UnsafeUrlError(`DNS_RESOLVED_PRIVATE_ADDRESS:${record.address}`);
    }
  }

  return records.map((record) => ({ address: record.address, family: record.family === 6 ? 6 : 4 }));
}

/**
 * Validates URL shape and resolves+checks DNS before every fetch (including
 * every redirect hop) so a monitored URL cannot be repointed at internal
 * infrastructure or the cloud metadata endpoint.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  const url = assertAllowedUrlShape(rawUrl);
  await resolvePublicHostname(url.hostname);
  return url;
}
