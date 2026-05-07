type Level = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

function emit(level: Level, message: string, context?: LogContext) {
  const payload = {
    level,
    msg: message,
    time: new Date().toISOString(),
    ...(context ?? {}),
  };

  // console.* works in both Node and Edge runtimes; Vercel ingests both.
  const line = JSON.stringify(payload, replacer);
  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      console.debug(line);
      break;
    default:
      console.log(line);
  }
}

function replacer(_: string, value: unknown) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: value.cause,
    };
  }
  return value;
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => emit("debug", msg, ctx),
  info: (msg: string, ctx?: LogContext) => emit("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => emit("warn", msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit("error", msg, ctx),
};
