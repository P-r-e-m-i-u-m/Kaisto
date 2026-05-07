const QueueProcessor = require("../processor");

jest.mock("../../config/redis");
jest.mock("../../services/logger");

const redis = require("../../config/redis");

describe("QueueProcessor", () => {
  let queue;
  beforeEach(() => {
    queue = new QueueProcessor("test-queue");
    jest.clearAllMocks();
  });

  describe("enqueue", () => {
    test("should enqueue a job with default priority", async () => {
      redis.zadd.mockResolvedValue(1);
      await queue.enqueue({ type: "email", data: { to: "test@test.com" } });
      expect(redis.zadd).toHaveBeenCalledWith("test-queue", 0, expect.any(String));
    });
    test("should enqueue with custom priority", async () => {
      redis.zadd.mockResolvedValue(1);
      await queue.enqueue({ type: "urgent" }, 10);
      expect(redis.zadd).toHaveBeenCalledWith("test-queue", 10, expect.any(String));
    });
  });

  describe("_execute", () => {
    test("increments processed on success", async () => {
      const handler = jest.fn().mockResolvedValue(true);
      await queue._execute({ type: "test", id: "1", retries: 0 }, handler);
      expect(queue.stats.processed).toBe(1);
    });
    test("retries failed job with backoff", async () => {
      jest.useFakeTimers();
      const handler = jest.fn().mockRejectedValue(new Error("fail"));
      const job = { type: "test", id: "1", retries: 0 };
      await queue._execute(job, handler);
      expect(job.retries).toBe(1);
      expect(queue.stats.retried).toBe(1);
      jest.useRealTimers();
    });
    test("moves to DLQ after max retries", async () => {
      redis.lpush.mockResolvedValue(1);
      const handler = jest.fn().mockRejectedValue(new Error("fail"));
      await queue._execute({ type: "test", id: "1", retries: 3 }, handler);
      expect(redis.lpush).toHaveBeenCalledWith("test-queue:dlq", expect.any(String));
      expect(queue.stats.failed).toBe(1);
    });
  });

  describe("getStats", () => {
    test("returns queue statistics", async () => {
      redis.zcard.mockResolvedValue(5);
      redis.llen.mockResolvedValue(2);
      const stats = await queue.getStats();
      expect(stats.pending).toBe(5);
      expect(stats.dead).toBe(2);
    });
  });
});
