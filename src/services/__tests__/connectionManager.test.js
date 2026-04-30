const ConnectionManager = require("../connectionManager");

jest.mock("../logger");

const makeSocket = () => ({
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
  send: jest.fn(),
  close: jest.fn()
});

describe("ConnectionManager", () => {
  let manager;
  beforeEach(() => { manager = new ConnectionManager(); });
  afterEach(() => { manager.destroy(); });

  test("adds connection and registers listeners", () => {
    const socket = makeSocket();
    manager.add("id1", socket);
    expect(manager.connections.size).toBe(1);
    expect(socket.on).toHaveBeenCalledWith("close", expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  test("removes connection and cleans up listeners", () => {
    const socket = makeSocket();
    manager.add("id1", socket);
    manager.remove("id1");
    expect(manager.connections.size).toBe(0);
    expect(socket.off).toHaveBeenCalled();
  });

  test("replaces existing connection on duplicate id", () => {
    const s1 = makeSocket(); const s2 = makeSocket();
    manager.add("id1", s1);
    manager.add("id1", s2);
    expect(manager.connections.size).toBe(1);
  });

  test("broadcasts to all connections", () => {
    const s1 = makeSocket(); const s2 = makeSocket();
    manager.add("id1", s1); manager.add("id2", s2);
    const sent = manager.broadcast("hello");
    expect(sent).toBe(2);
    expect(s1.send).toHaveBeenCalledWith("hello");
  });

  test("rejects connection when max reached", () => {
    manager.maxConnections = 1;
    manager.add("id1", makeSocket());
    const s2 = makeSocket();
    const result = manager.add("id2", s2);
    expect(result).toBe(false);
    expect(manager.connections.size).toBe(1);
  });
});
