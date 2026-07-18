#!/usr/bin/env node

import net from "node:net";
import tls from "node:tls";

const redisUrl = process.argv[2] || process.env.REDIS_URL;
const timeoutSeconds = Number.parseInt(process.env.SCCC_REDIS_CHECK_TIMEOUT_SECONDS || "5", 10);

function fail(message) {
  console.error(`[redis-check] FAIL ${message}`);
  process.exit(1);
}

function encodeCommand(parts) {
  return `*${parts.length}\r\n${parts
    .map((part) => {
      const value = String(part);
      return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
    })
    .join("")}`;
}

function parseNextResponse(buffer) {
  const firstLineEnd = buffer.indexOf("\r\n");
  if (firstLineEnd === -1) {
    return null;
  }

  const firstLine = buffer.slice(0, firstLineEnd);
  const rest = buffer.slice(firstLineEnd + 2);

  if (firstLine.startsWith("-")) {
    return {
      error: firstLine.slice(1),
      rest
    };
  }

  if (firstLine.startsWith("+") || firstLine.startsWith(":")) {
    return {
      value: firstLine.slice(1),
      rest
    };
  }

  if (firstLine.startsWith("$")) {
    const length = Number.parseInt(firstLine.slice(1), 10);
    if (!Number.isInteger(length) || length < -1) {
      return {
        error: `invalid bulk response length: ${firstLine}`,
        rest
      };
    }

    if (length === -1) {
      return {
        value: "",
        rest
      };
    }

    if (rest.length < length + 2) {
      return null;
    }

    return {
      value: rest.slice(0, length),
      rest: rest.slice(length + 2)
    };
  }

  return {
    error: `unexpected response: ${firstLine}`,
    rest
  };
}

if (!redisUrl) {
  fail("REDIS_URL argument or environment variable is required.");
}

let parsedUrl;
try {
  parsedUrl = new URL(redisUrl);
} catch {
  fail("REDIS_URL must be a valid redis:// or rediss:// URL.");
}

if (!["redis:", "rediss:"].includes(parsedUrl.protocol)) {
  fail("REDIS_URL must use redis:// or rediss://.");
}

const commands = [];
const username = decodeURIComponent(parsedUrl.username || "");
const password = decodeURIComponent(parsedUrl.password || "");
const selectedDatabase = parsedUrl.pathname.replace(/^\//, "");

if (username || password) {
  if (username) {
    commands.push(["AUTH", username, password]);
  } else {
    commands.push(["AUTH", password]);
  }
}

if (selectedDatabase) {
  commands.push(["SELECT", selectedDatabase]);
}

commands.push(["PING"]);

const socketOptions = {
  host: parsedUrl.hostname,
  port: Number.parseInt(parsedUrl.port || "6379", 10)
};

const usesTls = parsedUrl.protocol === "rediss:";
const socket = usesTls ? tls.connect(socketOptions) : net.connect(socketOptions);

let responseBuffer = "";
let commandIndex = 0;
let completed = false;

function cleanupAndExit(code) {
  completed = true;
  socket.destroy();
  process.exit(code);
}

function sendNextCommand() {
  socket.write(encodeCommand(commands[commandIndex]));
}

socket.setTimeout(timeoutSeconds * 1000);

if (usesTls) {
  socket.on("secureConnect", sendNextCommand);
} else {
  socket.on("connect", sendNextCommand);
}

socket.on("timeout", () => {
  fail(`timed out after ${timeoutSeconds}s.`);
});

socket.on("error", (error) => {
  if (!completed) {
    fail(error.message);
  }
});

socket.on("data", (chunk) => {
  responseBuffer += chunk.toString("utf8");

  let response = parseNextResponse(responseBuffer);
  while (response) {
    responseBuffer = response.rest;

    if (response.error) {
      fail(response.error);
    }

    const command = commands[commandIndex]?.[0];
    if (command === "PING" && response.value !== "PONG") {
      fail(`expected PONG, got ${response.value || "<empty>"}.`);
    }

    commandIndex += 1;

    if (commandIndex >= commands.length) {
      const host = parsedUrl.hostname || "redis";
      console.log(`[redis-check] OK ${host}:${socketOptions.port} responded to PING.`);
      cleanupAndExit(0);
      return;
    }

    sendNextCommand();
    response = parseNextResponse(responseBuffer);
  }
});
