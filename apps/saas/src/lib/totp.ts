import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const defaultStepSeconds = 30;
const defaultDigits = 6;
const defaultWindow = 1;

export type TotpVerificationResult = {
  valid: boolean;
  counter: number | null;
};

export function generateTotpSecret(bytes = 20): string {
  return encodeBase32(randomBytes(bytes));
}

export function buildTotpProvisioningUri(input: {
  issuer: string;
  accountName: string;
  secret: string;
}): string {
  const label = `${input.issuer}:${input.accountName}`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer: input.issuer,
    algorithm: "SHA1",
    digits: String(defaultDigits),
    period: String(defaultStepSeconds)
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function verifyTotpCode(input: {
  secret: string;
  code: string;
  now?: Date;
  lastCounter?: number | null;
  window?: number;
}): TotpVerificationResult {
  const normalizedCode = input.code.trim();

  if (!/^\d{6}$/.test(normalizedCode)) {
    return {
      valid: false,
      counter: null
    };
  }

  const secret = decodeBase32(input.secret);
  const currentCounter = Math.floor(
    (input.now?.getTime() ?? Date.now()) / 1000 / defaultStepSeconds
  );
  const window = input.window ?? defaultWindow;

  for (let offset = -window; offset <= window; offset += 1) {
    const counter = currentCounter + offset;

    if (
      counter < 0 ||
      (input.lastCounter !== null &&
        input.lastCounter !== undefined &&
        counter <= input.lastCounter)
    ) {
      continue;
    }

    if (safeCodeEquals(generateHotp(secret, counter), normalizedCode)) {
      return {
        valid: true,
        counter
      };
    }
  }

  return {
    valid: false,
    counter: null
  };
}

export function generateTotpCodeForTest(secret: string, now: Date): string {
  const counter = Math.floor(now.getTime() / 1000 / defaultStepSeconds);
  return generateHotp(decodeBase32(secret), counter);
}

function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += base32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += base32Alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32(secret: string): Buffer {
  const normalized = secret.replaceAll(" ", "").replace(/=+$/u, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of normalized) {
    const index = base32Alphabet.indexOf(char);

    if (index === -1) {
      throw new Error("TOTP_SECRET_INVALID");
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateHotp(secret: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac("sha1", secret).update(counterBuffer).digest();
  const offset = digest[digest.length - 1]! & 15;
  const binary =
    ((digest[offset]! & 127) << 24) |
    ((digest[offset + 1]! & 255) << 16) |
    ((digest[offset + 2]! & 255) << 8) |
    (digest[offset + 3]! & 255);
  const password = binary % 10 ** defaultDigits;

  return String(password).padStart(defaultDigits, "0");
}

function safeCodeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
