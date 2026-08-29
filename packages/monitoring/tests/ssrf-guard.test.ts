import { describe, expect, it } from "vitest";

import {
  assertAllowedUrlShape,
  isPrivateOrReservedAddress,
  UnsafeUrlError
} from "../src/ssrf-guard";

describe("assertAllowedUrlShape", () => {
  it("accepts http and https URLs", () => {
    expect(assertAllowedUrlShape("https://example.com/page").hostname).toBe("example.com");
    expect(assertAllowedUrlShape("http://example.com/page").hostname).toBe("example.com");
  });

  it("rejects non-http(s) protocols", () => {
    expect(() => assertAllowedUrlShape("file:///etc/passwd")).toThrow(UnsafeUrlError);
    expect(() => assertAllowedUrlShape("ftp://example.com")).toThrow(UnsafeUrlError);
  });

  it("rejects invalid URLs", () => {
    expect(() => assertAllowedUrlShape("not a url")).toThrow(UnsafeUrlError);
  });
});

describe("isPrivateOrReservedAddress (IPv4)", () => {
  const cases: Array<[string, boolean]> = [
    ["8.8.8.8", false],
    ["93.184.216.34", false],
    ["127.0.0.1", true],
    ["10.0.0.5", true],
    ["172.16.0.1", true],
    ["172.31.255.255", true],
    ["172.32.0.1", false],
    ["192.168.1.1", true],
    ["169.254.169.254", true], // cloud metadata endpoint
    ["100.64.0.1", true],
    ["0.0.0.0", true],
    ["224.0.0.1", true]
  ];

  for (const [address, expected] of cases) {
    it(`${address} -> private=${expected}`, () => {
      expect(isPrivateOrReservedAddress(address, 4)).toBe(expected);
    });
  }
});

describe("isPrivateOrReservedAddress (IPv6)", () => {
  const cases: Array<[string, boolean]> = [
    ["2606:4700:4700::1111", false], // public (Cloudflare DNS)
    ["::1", true],
    ["fe80::1", true],
    ["fc00::1", true],
    ["fd12:3456:789a::1", true],
    ["::ffff:127.0.0.1", true],
    ["::ffff:8.8.8.8", false]
  ];

  for (const [address, expected] of cases) {
    it(`${address} -> private=${expected}`, () => {
      expect(isPrivateOrReservedAddress(address, 6)).toBe(expected);
    });
  }
});
