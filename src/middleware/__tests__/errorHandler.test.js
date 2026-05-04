const { errorHandler, asyncHandler, AppError, ValidationError, NotFoundError } = require("../errorHandler");

jest.mock("../../services/logger");

const makeRes = () => { const r = {}; r.status = jest.fn().mockReturnValue(r); r.json = jest.fn().mockReturnValue(r); return r; };
const makeReq = (id = "req-123") => ({ headers: { "x-request-id": id }, method: "GET", originalUrl: "/test" });

describe("AppError", () => {
  test("creates error with correct properties", () => {
    const err = new AppError("test", 400, "BAD_REQUEST");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.isOperational).toBe(true);
  });
});

describe("ValidationError", () => {
  test("has 422 status code", () => {
    const err = new ValidationError("invalid input");
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("VALIDATION_ERROR");
  });
});

describe("NotFoundError", () => {
  test("has 404 status code", () => {
    const err = new NotFoundError("User");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("User not found");
  });
});

describe("errorHandler", () => {
  test("returns 500 for generic errors", () => {
    const err = new Error("Something broke");
    errorHandler(err, makeReq(), makeRes(), jest.fn());
  });

  test("returns correct status for AppError", () => {
    const err = new AppError("Not found", 404, "NOT_FOUND");
    const res = makeRes();
    errorHandler(err, makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("asyncHandler", () => {
  test("passes errors to next()", async () => {
    const err = new Error("async error");
    const handler = asyncHandler(async () => { throw err; });
    const next = jest.fn();
    await handler({}, {}, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
