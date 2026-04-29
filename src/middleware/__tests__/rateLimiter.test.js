const { slidingWindowLimiter } = require("../rateLimiter");

jest.mock("../../config/redis");
jest.mock("../../services/logger");

const redis = require("../../config/redis");

describe("slidingWindowLimiter", () => {
  const makeReqRes = (ip = "127.0.0.1") => ({
    req: { ip },
    res: { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() }
  });

  beforeEach(() => { jest.clearAllMocks(); });

  test("allows requests under the limit", async () => {
    redis.zremrangebyscore.mockResolvedValue(0);
    redis.zcard.mockResolvedValue(5);
    redis.zadd.mockResolvedValue(1);
    redis.pexpire.mockResolvedValue(1);
    const { req, res } = makeReqRes();
    const next = jest.fn();
    await slidingWindowLimiter({ max: 100 })(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 94);
  });

  test("blocks requests over the limit with 429", async () => {
    redis.zremrangebyscore.mockResolvedValue(0);
    redis.zcard.mockResolvedValue(100);
    redis.zrange.mockResolvedValue(["member", String(Date.now() - 5000)]);
    const { req, res } = makeReqRes();
    const next = jest.fn();
    await slidingWindowLimiter({ max: 10 })(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  test("allows request on redis error (fail open)", async () => {
    redis.zremrangebyscore.mockRejectedValue(new Error("Redis down"));
    const { req, res } = makeReqRes();
    const next = jest.fn();
    await slidingWindowLimiter({ max: 10 })(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
