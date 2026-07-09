import { describe, expect, it } from "vitest";

import { createJobHandlerRegistry } from "./job-handlers";
import { buildWorkerId, registerFoundationHandlers } from "./worker";

describe("worker foundation", () => {
  it("builds worker ids from hostname and pid", () => {
    expect(buildWorkerId("worker-host", 42)).toBe("worker-host:42");
  });

  it("registers the maintenance ping handler", () => {
    const registry = createJobHandlerRegistry();
    registerFoundationHandlers(registry);

    expect(registry.registeredJobNames()).toEqual(["maintenance.ping"]);
    expect(() => registry.resolve("maintenance.ping")).not.toThrow();
  });
});
