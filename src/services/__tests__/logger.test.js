const { Logger } = require("../logger");

describe("Logger", () => {
  let logger;
  let stdoutSpy, stderrSpy;

  beforeEach(() => {
    logger = new Logger("test", { logDir: "/tmp/test-logs" });
    stdoutSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => {});
    stderrSpy = jest.spyOn(process.stderr, "write").mockImplementation(() => {});
  });
  afterEach(() => { stdoutSpy.mockRestore(); stderrSpy.mockRestore(); });

  test("formats log entry as valid JSON", () => {
    const line = logger._format("info", "test", { key: "val" });
    const parsed = JSON.parse(line);
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("test");
    expect(parsed.key).toBe("val");
    expect(parsed.ts).toBeDefined();
    expect(parsed.context).toBe("test");
  });

  test("writes errors to stderr", () => {
    logger.error("test error", new Error("oops"));
    expect(stderrSpy).toHaveBeenCalled();
  });

  test("writes info to stdout", () => {
    logger.info("test info");
    expect(stdoutSpy).toHaveBeenCalled();
  });

  test("creates child logger with correct context", () => {
    const child = logger.child("module");
    expect(child.context).toBe("test:module");
  });

  test("time() returns elapsed duration", (done) => {
    const timer = logger.time("operation");
    setTimeout(() => { timer.end(); expect(stdoutSpy).toHaveBeenCalled(); done(); }, 10);
  });
});
