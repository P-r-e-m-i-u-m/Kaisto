interface LogMeta { [key: string]: unknown; }

const logger = {
  info: (msg: string, meta: LogMeta = {}): void => {
    console.log(JSON.stringify({ level: "info", msg, ...meta, ts: Date.now() }));
  },
  error: (msg: string, err?: Error): void => {
    console.error(JSON.stringify({ level: "error", msg, stack: err?.stack, ts: Date.now() }));
  },
  warn: (msg: string, meta: LogMeta = {}): void => {
    console.warn(JSON.stringify({ level: "warn", msg, ...meta, ts: Date.now() }));
  }
};

export default logger;
// updated: 2026-06-30 build: 1782819553
