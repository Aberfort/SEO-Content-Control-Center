import { logWorkerEvent, serializeError } from "./logger";
import { startWorker } from "./worker";

async function main(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logWorkerEvent("error", "worker.missing_redis_url", {
      hint: "Set REDIS_URL before starting the worker process."
    });
    process.exitCode = 1;
    return;
  }

  const workerProcess = await startWorker({ redisUrl });
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logWorkerEvent("info", "worker.shutdown_requested", {
      workerId: workerProcess.workerId,
      signal
    });

    try {
      await workerProcess.shutdown();
      process.exitCode = 0;
    } catch (error) {
      logWorkerEvent("error", "worker.shutdown_failed", {
        workerId: workerProcess.workerId,
        reason: serializeError(error)
      });
      process.exitCode = 1;
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((error) => {
  logWorkerEvent("error", "worker.start_failed", {
    reason: serializeError(error)
  });
  process.exitCode = 1;
});
