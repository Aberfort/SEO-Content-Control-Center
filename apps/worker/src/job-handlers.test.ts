import { describe, expect, it } from "vitest";

import {
  createJobHandlerRegistry,
  createMaintenancePingHandler,
  withTenantScope
} from "./job-handlers";

describe("job handler registry", () => {
  it("registers and resolves handlers by job name", async () => {
    const registry = createJobHandlerRegistry();
    registry.register("maintenance.ping", () => Promise.resolve("pong"));

    await expect(
      registry.resolve("maintenance.ping")({
        id: "1",
        name: "maintenance.ping",
        data: {}
      })
    ).resolves.toBe("pong");
    expect(registry.registeredJobNames()).toEqual(["maintenance.ping"]);
  });

  it("rejects duplicate and empty registrations", () => {
    const registry = createJobHandlerRegistry();
    registry.register("maintenance.ping", () => Promise.resolve(null));

    expect(() => registry.register("maintenance.ping", () => Promise.resolve(null))).toThrow(
      "JOB_HANDLER_DUPLICATE"
    );
    expect(() => registry.register("  ", () => Promise.resolve(null))).toThrow("JOB_NAME_REQUIRED");
  });

  it("fails fast for unknown job names", () => {
    const registry = createJobHandlerRegistry();

    expect(() => registry.resolve("unknown.job")).toThrow("JOB_HANDLER_NOT_FOUND");
  });
});

describe("tenant scope wrapper", () => {
  it("rejects tenant jobs without organization and site scope", async () => {
    const handler = withTenantScope(() => Promise.resolve("worked"));

    await expect(
      handler({
        id: "1",
        name: "gsc.daily-metrics.sync",
        data: { organizationId: "11111111-1111-4111-8111-111111111111" }
      })
    ).rejects.toThrow();
  });

  it("runs the handler when tenant scope is present", async () => {
    const handler = withTenantScope(() => Promise.resolve("worked"));

    await expect(
      handler({
        id: "1",
        name: "gsc.daily-metrics.sync",
        data: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          siteId: "22222222-2222-4222-8222-222222222222"
        }
      })
    ).resolves.toBe("worked");
  });
});

describe("maintenance ping handler", () => {
  it("responds with a validated pong payload", async () => {
    const handler = createMaintenancePingHandler();

    await expect(
      handler({
        id: "1",
        name: "maintenance.ping",
        data: { requestedBy: "smoke-test", echo: "hello" }
      })
    ).resolves.toMatchObject({
      pong: true,
      requestedBy: "smoke-test",
      echo: "hello"
    });
  });

  it("rejects unexpected ping payload keys", async () => {
    const handler = createMaintenancePingHandler();

    await expect(
      handler({
        id: "1",
        name: "maintenance.ping",
        data: { token: "should-not-pass" }
      })
    ).rejects.toThrow();
  });
});
